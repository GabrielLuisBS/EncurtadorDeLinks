import "dotenv/config";
import { pathToFileURL } from "node:url";
import { redis } from "../db/redis.js";
import { clickRepository } from "../repositories/click.repository.js";
import { STREAM_KEY } from "../services/click-queue.service.js";
import { Prisma } from "../generated/prisma/client.js";

const GROUP_NAME = "cliques-workers";
const CONSUMER_NAME = process.env.WORKER_ID ?? "worker-1";
const BLOCK_MS = 5000;
const BATCH_SIZE = 10;
// Teto de segurança só do modo --once: evita um run sem fim se o stream
// acumular um volume anormal entre execuções do cron. 50 lotes de 10 =
// 500 eventos por execução, bem acima do que 5 minutos de tráfego real
// deveria gerar nesta escala — se bater nisso, é sinal de algo errado
// (cron parado por um tempo, ou pico fora do normal), não do caminho feliz.
const MAX_BATCHES_ONCE = 50;

function fieldsToObject(fields: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

function emptyToNull(value: string | undefined): string | null {
  return !value ? null : value;
}

/**
 * Cria o consumer group na primeira vez que o worker roda. Começa do
 * início do stream ("0"), não de "$" — assim processa qualquer evento
 * publicado antes do primeiro worker existir, não só os futuros.
 * BUSYGROUP (grupo já existe) é o caminho normal em reinícios.
 */
async function ensureGroup(): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
  } catch (error) {
    const isBusyGroup = error instanceof Error && error.message.includes("BUSYGROUP");
    if (!isBusyGroup) {
      throw error;
    }
  }
}

/**
 * P2003 (violação de foreign key) e P2025 (registro esperado não
 * encontrado) nunca vão ter sucesso numa nova tentativa — o linkId do
 * evento não existe mais em Link (achado real rodando isto contra o
 * banco de dev: havia entradas na PEL de sessões antigas apontando pra
 * links que já foram removidos). Sem esse descarte, essas entradas
 * ficam presas na PEL pra sempre e são re-tentadas em *todo* run,
 * inclusive nos futuros — inclui erro de conexão/timeout de propósito
 * (não entram aqui): esses são transitórios, vale deixar pendente pra
 * ser reprocessado quando o banco voltar.
 */
function isPermanentFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2025")
  );
}

async function processEntry(id: string, fields: string[]): Promise<void> {
  const data = fieldsToObject(fields);

  try {
    await clickRepository.create({
      linkId: data.linkId,
      quando: new Date(data.quando),
      pais: emptyToNull(data.pais),
      referer: emptyToNull(data.referer),
      dispositivo: data.dispositivo,
    });
  } catch (error) {
    if (!isPermanentFailure(error)) throw error;

    console.error(
      `[click.worker] descartando ${id}: linkId "${data.linkId}" não existe mais em Link (nunca vai ter sucesso).`,
    );
    await redis.xack(STREAM_KEY, GROUP_NAME, id);
    return;
  }

  // Só confirma (XACK) depois do INSERT ter sucesso — se a escrita
  // falhar por um motivo transitório, a entrada fica pendente no grupo
  // pra ser reprocessada, em vez de ser silenciosamente descartada.
  await redis.xack(STREAM_KEY, GROUP_NAME, id);
}

/**
 * Lê um lote e processa cada entrada. `blockMs > 0` usa BLOCK (espera até
 * ter algo ou estourar o timeout); `blockMs === 0` não bloqueia — pede o
 * que já estiver disponível agora e retorna na hora, mesmo vazio. É a
 * segunda forma que permite ao modo --once saber quando parar.
 */
async function consumeBatch(blockMs: number, from: string): Promise<number> {
  const response =
    blockMs > 0
      ? await redis.xreadgroup(
          "GROUP",
          GROUP_NAME,
          CONSUMER_NAME,
          "COUNT",
          BATCH_SIZE,
          "BLOCK",
          blockMs,
          "STREAMS",
          STREAM_KEY,
          from,
        )
      : await redis.xreadgroup(
          "GROUP",
          GROUP_NAME,
          CONSUMER_NAME,
          "COUNT",
          BATCH_SIZE,
          "STREAMS",
          STREAM_KEY,
          from,
        );

  if (!response) return 0;

  let processed = 0;
  for (const [, entries] of response) {
    if (!entries) continue;
    for (const [id, fields] of entries) {
      if (!fields) continue;
      try {
        await processEntry(id, fields);
        processed++;
      } catch (error) {
        console.error(`[click.worker] falha ao processar ${id}:`, error);
      }
    }
  }
  return processed;
}

/**
 * Loop contínuo — o que `npm run worker` roda em dev, e o que um
 * Background Worker de verdade no Render usaria (`npm run start:worker`),
 * se algum dia fizer sentido pagar pelo plano starter em vez do modo
 * --once via GitHub Actions. Nunca termina sozinho.
 */
export async function runForever(): Promise<void> {
  await ensureGroup();
  console.log(`[click.worker] consumindo "${STREAM_KEY}" continuamente como "${CONSUMER_NAME}"`);
  for (;;) {
    await consumeBatch(BLOCK_MS, ">");
  }
}

/**
 * Drena o que estiver disponível agora e termina — pensado pra rodar
 * como job agendado (GitHub Actions, a cada 5 minutos) em vez de um
 * processo sempre ligado, que no Render exigiria o plano pago de
 * Background Worker (ver a decisão em render.yaml e TODO.md).
 *
 * Primeiro reprocessa qualquer entrada pendente deste consumer (entregue
 * numa execução anterior que não chegou a dar XACK — ex.: o job foi
 * cancelado no meio), depois lê novidades ("&gt;") sem bloquear, em lotes,
 * até o stream esvaziar ou bater o teto de segurança.
 */
export async function runOnce(): Promise<{ processed: number }> {
  await ensureGroup();
  let processed = 0;

  processed += await consumeBatch(0, "0");

  for (let i = 0; i < MAX_BATCHES_ONCE; i++) {
    const count = await consumeBatch(0, ">");
    processed += count;
    if (count === 0) break;
  }

  console.log(`[click.worker] --once: ${processed} evento(s) processado(s) como "${CONSUMER_NAME}".`);
  return { processed };
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const once = process.argv.includes("--once");
  const run = once ? runOnce() : runForever();

  run
    .then(() => {
      // Só o modo --once chega até aqui de verdade (runForever nunca
      // resolve) — sem isto o processo do GitHub Actions fica pendurado
      // esperando a conexão ioredis fechar sozinha.
      if (once) process.exit(0);
    })
    .catch((error) => {
      console.error("[click.worker] erro fatal:", error);
      process.exit(1);
    });
}
