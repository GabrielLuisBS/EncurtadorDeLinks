import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import {
  computeStatus,
  InvalidExpirationError,
  InvalidUrlError,
  LinkNotFoundError,
  linkService,
} from "../services/link.service.js";
import { qrcodeService } from "../services/qrcode.service.js";
import { isValidSlugFormat } from "../services/slug.js";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:3333";

interface CreateLinkBody {
  url?: string;
}

interface SlugParams {
  slug: string;
}

interface PatchLinkBody {
  ativo?: boolean;
  expiraEm?: string | null;
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

  app.get<{ Params: SlugParams }>(
    "/links/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      if (!isValidSlugFormat(slug)) {
        return reply.status(400).send({ error: "Slug inválido." });
      }

      try {
        const link = await linkService.getBySlug(slug);
        return reply.send({
          slug: link.slug,
          urlDestino: link.urlDestino,
          ativo: link.ativo,
          criadoEm: link.criadoEm,
          expiraEm: link.expiraEm,
          status: computeStatus(link.ativo, link.expiraEm),
        });
      } catch (error) {
        if (error instanceof LinkNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: SlugParams }>(
    "/links/:slug/qrcode",
    // Só leitura (não cria nem muta nada), então recebe um teto mais
    // generoso que o default de 20/min do plugin — pensado para
    // criação/mutação, não para servir uma imagem sob demanda.
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { slug } = request.params;
      if (!isValidSlugFormat(slug)) {
        return reply.status(400).send({ error: "Slug inválido." });
      }

      try {
        const link = await linkService.getBySlug(slug);
        const png = await qrcodeService.generatePng(`${PUBLIC_BASE_URL}/${link.slug}`);
        return reply.header("Content-Type", "image/png").send(png);
      } catch (error) {
        if (error instanceof LinkNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: SlugParams; Body: PatchLinkBody }>(
    "/links/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      const { ativo, expiraEm } = request.body ?? {};

      if (!isValidSlugFormat(slug)) {
        return reply.status(400).send({ error: "Slug inválido." });
      }
      if (ativo !== undefined && typeof ativo !== "boolean") {
        return reply.status(400).send({ error: 'Campo "ativo" deve ser booleano.' });
      }
      if (expiraEm !== undefined && expiraEm !== null && typeof expiraEm !== "string") {
        return reply
          .status(400)
          .send({ error: 'Campo "expiraEm" deve ser uma data ISO 8601 ou null.' });
      }
      if (ativo === undefined && expiraEm === undefined) {
        return reply
          .status(400)
          .send({ error: 'Informe ao menos um campo: "ativo" ou "expiraEm".' });
      }

      try {
        const link = await linkService.update(slug, { ativo, expiraEm });
        return reply.send({ slug: link.slug, ativo: link.ativo, expiraEm: link.expiraEm });
      } catch (error) {
        if (error instanceof LinkNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidExpirationError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
