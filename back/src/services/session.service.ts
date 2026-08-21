import { randomBytes } from "node:crypto";
import { redis } from "../db/redis.js";

const SESSION_PREFIX = "sessao:";
// 30 dias — sessão de produto simples, sem "lembrar de mim" separado.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = "linkly_session";

function keyFor(token: string): string {
  return `${SESSION_PREFIX}${token}`;
}

/**
 * Sessão como token opaco (não JWT, não cookie assinado com o id dentro):
 * o cookie só guarda um valor aleatório sem significado próprio, e o
 * Redis é a única fonte de verdade de qual usuário ele representa. Isso
 * torna logout/revogação um DEL simples — um JWT autocontido não pode
 * ser invalidado antes de expirar sem uma blocklist à parte.
 */
export const sessionService = {
  async create(usuarioId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await redis.set(keyFor(token), usuarioId, "EX", SESSION_TTL_SECONDS);
    return token;
  },

  async resolve(token: string): Promise<string | null> {
    return redis.get(keyFor(token));
  },

  async destroy(token: string): Promise<void> {
    await redis.del(keyFor(token));
  },
};
