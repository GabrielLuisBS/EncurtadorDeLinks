import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { InvalidUrlError, linkService } from "../services/link.service.js";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:3333";

interface CreateLinkBody {
  url?: string;
}

export async function linksRoutes(app: FastifyInstance) {
  // Escopado a este plugin (não afeta outras rotas). Chave por IP é o
  // comportamento padrão do plugin. Atrás de proxy (Render, fase 10),
  // vai precisar de `app.register(fastify, { trustProxy: true })` pro
  // req.ip refletir o IP real do cliente, não o do proxy — revisar então.
  await app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
  });

  app.post<{ Body: CreateLinkBody }>(
    "/links",
    async (request, reply) => {
      const { url } = request.body ?? {};

      if (typeof url !== "string" || url.trim().length === 0) {
        return reply.status(400).send({ error: 'Campo "url" é obrigatório.' });
      }

      try {
        const link = await linkService.createLink(url);
        return reply.status(201).send({
          slug: link.slug,
          urlCurta: `${PUBLIC_BASE_URL}/${link.slug}`,
        });
      } catch (error) {
        if (error instanceof InvalidUrlError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
