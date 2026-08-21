import type { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_COOKIE_NAME, sessionService } from "./session.service.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Setado por attachUsuario quando há sessão válida; undefined caso
     * contrário (anônimo, cookie ausente, expirado ou adulterado). */
    usuarioId?: string;
  }
}

async function resolveFromCookie(request: FastifyRequest): Promise<string | undefined> {
  const raw = request.cookies[SESSION_COOKIE_NAME];
  if (!raw) return undefined;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return undefined;

  return (await sessionService.resolve(unsigned.value)) ?? undefined;
}

/**
 * Modo "opcional" do preHandler pedido no passo 11.3: anexa
 * `request.usuarioId` se houver sessão válida, nunca bloqueia a
 * requisição. Registrado como onRequest (não preHandler de rota) em
 * linksRoutes — precisa rodar antes do hook do @fastify/rate-limit pra
 * que o keyGenerator (usuário autenticado vs. IP) consiga ler
 * `request.usuarioId`. Ver "Segurança": "o rate limiter deveria já
 * nascer com essa extensão em mente".
 */
export async function attachUsuario(request: FastifyRequest): Promise<void> {
  request.usuarioId = await resolveFromCookie(request);
}

/**
 * Modo "obrigatório": 401 se `attachUsuario` não encontrou sessão
 * válida. Depende de attachUsuario já ter rodado antes (onRequest) —
 * não resolve o cookie de novo, só verifica o resultado.
 */
export async function exigirUsuario(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.usuarioId) {
    return reply.status(401).send({ error: "Sessão inválida ou expirada." });
  }
}
