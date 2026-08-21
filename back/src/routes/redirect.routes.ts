import type { FastifyInstance } from "fastify";
import { redirectService } from "../services/redirect.service.js";
import { isValidSlugFormat } from "../services/slug.js";
import { clickQueueService } from "../services/click-queue.service.js";
import { redirectLatencySeconds } from "../metrics.js";
import {
  classifyDevice,
  getCountryFromHeaders,
  truncate,
} from "../utils/click-context.js";

interface RedirectParams {
  slug: string;
}

// Mesmo teto de "Cache e Redis" (as chaves ficam presas ao mesmo TTL) e de
// link.service.ts (MAX_URL_LENGTH) — um referer é, na prática, uma URL.
const MAX_REFERER_LENGTH = 2048;
// País vindo de header de borda (Cloudflare/Vercel) é normalmente um
// código de 2-3 letras, mas o header pode ser forjado por qualquer
// cliente — mesmo teto usado para validar o filtro "pais" no dashboard
// (ver stats-query.ts), por consistência entre o que entra e o que se
// pode consultar depois.
const MAX_PAIS_LENGTH = 100;

export async function redirectRoutes(app: FastifyInstance) {
  app.get<{ Params: RedirectParams }>("/:slug", async (request, reply) => {
    const { slug } = request.params;
    // Cronometra o handler inteiro (formato do slug até a decisão final),
    // não só resolveLink — a resposta 404 de slug malformado também é
    // latência real que o usuário sente. Não inclui a publicação do
    // clique, que é fire-and-forget e não atrasa a resposta de propósito
    // (ver comentário abaixo).
    const stopTimer = redirectLatencySeconds.startTimer();

    if (!isValidSlugFormat(slug)) {
      stopTimer({ resultado: "not_found" });
      return reply.status(404).send({ error: "Link não encontrado." });
    }

    const result = await redirectService.resolveLink(slug);

    if (result.status === "not_found") {
      stopTimer({ resultado: "not_found" });
      return reply.status(404).send({ error: "Link não encontrado." });
    }
    if (result.status === "gone") {
      stopTimer({ resultado: "gone" });
      return reply.status(410).send({ error: "Link desativado ou expirado." });
    }

    // Dispara sem aguardar — a resposta 302 não pode esperar a escrita
    // do clique (ver "Registro de Cliques" / "Redirecionamento" no
    // Obsidian). Falha na publicação é logada, nunca propagada ao cliente.
    void clickQueueService
      .publish({
        linkId: result.linkId,
        quando: new Date().toISOString(),
        pais: truncate(getCountryFromHeaders(request.headers), MAX_PAIS_LENGTH),
        referer: truncate(request.headers.referer ?? null, MAX_REFERER_LENGTH),
        dispositivo: classifyDevice(request.headers["user-agent"]),
      })
      .catch((err) => {
        request.log.error({ err }, "falha ao publicar evento de clique");
      });

    stopTimer({ resultado: "ok" });
    // 302, nunca 301 — o navegador precisa continuar passando pelo
    // servidor a cada acesso para o clique ser contabilizado.
    return reply.redirect(result.urlDestino, 302);
  });
}
