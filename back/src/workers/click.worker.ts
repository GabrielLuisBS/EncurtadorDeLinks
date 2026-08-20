import "dotenv/config";
import { redis } from "../db/redis.js";
import { clickRepository } from "../repositories/click.repository.js";
import { STREAM_KEY } from "../services/click-queue.service.js";

const GROUP_NAME = "cliques-workers";
const CONSUMER_NAME = process.env.WORKER_ID ?? "worker-1";
const BLOCK_MS = 5000;
const BATCH_SIZE = 10;

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

async function processEntry(id: string, fields: string[]): Promise<void> {
  const data = fieldsToObject(fields);

  await clickRepository.create({
    linkId: data.linkId,
    quando: new Date(data.quando),
    pais: emptyToNull(data.pais),
    referer: emptyToNull(data.referer),
    dispositivo: data.dispositivo,
  });

  // Só confirma (XACK) depois do INSERT ter sucesso — se a escrita
  // falhar, a entrada fica pendente no grupo pra ser reprocessada,
  // em vez de ser silenciosamente descartada.
  await redis.xack(STREAM_KEY, GROUP_NAME, id);
}

async function loop(): Promise<void> {
  await ensureGroup();
  console.log(`[click.worker] consumindo "${STREAM_KEY}" como "${CONSUMER_NAME}"`);

  for (;;) {
    const response = await redis.xreadgroup(
      "GROUP",
      GROUP_NAME,
      CONSUMER_NAME,
      "COUNT",
      BATCH_SIZE,
      "BLOCK",
      BLOCK_MS,
      "STREAMS",
      STREAM_KEY,
      ">",
    );

    if (!response) {
      continue; // BLOCK estourou sem eventos novos, volta a esperar
    }

    for (const [, entries] of response) {
      if (!entries) continue;
      for (const [id, fields] of entries) {
        if (!fields) continue;
        try {
          await processEntry(id, fields);
        } catch (error) {
          console.error(`[click.worker] falha ao processar ${id}:`, error);
        }
      }
    }
  }
}

loop().catch((error) => {
  console.error("[click.worker] erro fatal:", error);
  process.exit(1);
});
