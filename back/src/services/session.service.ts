import { randomBytes } from "node:crypto";
import { redis } from "../db/redis.js";

const SESSION_PREFIX = "sessao:";
// 30 dias — sessão de produto simples, sem "lembrar de mim" separado.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = "linkly_session";

export interface SessionData {
  usuarioId: string;
  nome: string;
  email: string;
}

function keyFor(token: string): string {
  return `${SESSION_PREFIX}${token}`;
}

/**
 * Sessão como token opaco (não JWT, não cookie assinado com o id dentro):
 * o cookie só guarda um valor aleatório sem significado próprio, e o
 * Redis é a única fonte de verdade de qual usuário ele representa. Isso
 * torna logout/revogação um DEL simples — um JWT autocontido não pode
 * ser invalidado antes de expirar sem uma blocklist à parte.
 *
 * Guarda nome/email junto com o id (não só usuarioId) pelo mesmo motivo
 * de `linkId` em cache.service.ts: GET /auth/me (passo 11.4) fica um GET
 * no Redis em vez de uma segunda ida ao Postgres a cada carregamento de
 * página. Como não existe edição de perfil no produto, não há risco de
 * nome/email ficarem obsoletos enquanto a sessão dura.
 */
export const sessionService = {
  async create(data: SessionData): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await redis.set(keyFor(token), JSON.stringify(data), "EX", SESSION_TTL_SECONDS);
    return token;
  },

  async resolve(token: string): Promise<SessionData | null> {
    const raw = await redis.get(keyFor(token));
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  },

  async destroy(token: string): Promise<void> {
    await redis.del(keyFor(token));
  },
};
