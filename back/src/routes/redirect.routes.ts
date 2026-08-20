import type { FastifyInstance } from "fastify";
import { clickQueueService } from "../services/click-queue.service.js";
import { redirectService } from "../services/redirect.service.js";
import { classifyDevice, getCountryFromHeaders } from "../utils/click-context.js";

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

    // Dispara sem aguardar — a resposta 302 não pode esperar a escrita
    // do clique (ver "Registro de Cliques" / "Redirecionamento" no
    // Obsidian). Falha na publicação é logada, nunca propagada ao cliente.
    void clickQueueService
      .publish({
        linkId: result.linkId,
        quando: new Date().toISOString(),
        pais: getCountryFromHeaders(request.headers),
        referer: request.headers.referer ?? null,
        dispositivo: classifyDevice(request.headers["user-agent"]),
      })
      .catch((err) => {
        request.log.error({ err }, "falha ao publicar evento de clique");
      });

    // 302, nunca 301 — o navegador precisa continuar passando pelo
    // servidor a cada acesso para o clique ser contabilizado.
    return reply.redirect(result.urlDestino, 302);
  });
}
