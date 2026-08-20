import type { FastifyInstance } from "fastify";
import { redirectService } from "../services/redirect.service.js";

interface RedirectParams {
  slug: string;
}

export async function redirectRoutes(app: FastifyInstance) {
  app.get<{ Params: RedirectParams }>("/:slug", async (request, reply) => {
    const { slug } = request.params;
    const result = await redirectService.resolveLink(slug);

    if (result.status === "not_found") {
      return reply.status(404).send({ error: "Link não encontrado." });
    }
    if (result.status === "gone") {
      return reply.status(410).send({ error: "Link desativado ou expirado." });
    }

    // 302, nunca 301 — o navegador precisa continuar passando pelo
    // servidor a cada acesso para o clique ser contabilizado (fase 4).
    return reply.redirect(result.urlDestino, 302);
  });
}
