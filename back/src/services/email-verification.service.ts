import { randomBytes } from "node:crypto";
import { redis } from "../db/redis.js";

const TOKEN_PREFIX = "verificacao-email:";
// 24h — mais curto que a sessão (30 dias) de propósito: é um link
// mandado por e-mail, não uma credencial de uso contínuo. Expirar rápido
// limita a janela de um link de verificação vazado/esquecido numa caixa
// de entrada compartilhada.
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function keyFor(token: string): string {
  return `${TOKEN_PREFIX}${token}`;
}

/**
 * Token opaco no Redis, mesmo raciocínio do sessionService: o valor em
 * si não significa nada fora do Redis, então um link de verificação
 * "usado" ou expirado é só um DEL — não tem estado pra limpar em nenhum
 * outro lugar.
 */
export const emailVerificationService = {
  async create(usuarioId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await redis.set(keyFor(token), usuarioId, "EX", TOKEN_TTL_SECONDS);
    return token;
  },

  async resolve(token: string): Promise<string | null> {
    return redis.get(keyFor(token));
  },

  async destroy(token: string): Promise<void> {
    await redis.del(keyFor(token));
  },
};
