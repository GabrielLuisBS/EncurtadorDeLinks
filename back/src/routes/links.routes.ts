import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import {
  computeStatus,
  InvalidExpirationError,
  LinkOwnershipError,
  InvalidUrlError,
  LinkNotFoundError,
  linkService,
} from "../services/link.service.js";
import { qrcodeService } from "../services/qrcode.service.js";
import { isValidSlugFormat } from "../services/slug.js";
import { rateLimitBlockedTotal } from "../metrics.js";
import { attachUsuario, exigirUsuario } from "../services/auth-context.service.js";
import { InvalidQueryError, parsePagination } from "../utils/stats-query.js";

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
  // Modo "opcional" do preHandler de auth (passo 11.3) — roda em onRequest,
  // não em preHandler de rota, e ANTES do registro do rate-limit abaixo:
  // precisa terminar antes do keyGenerator do plugin ler request.usuarioId.
  // Nunca bloqueia a requisição, só anexa o dono quando há sessão válida.
  app.addHook("onRequest", attachUsuario);

  // Escopado a este plugin (não afeta outras rotas). Atrás de proxy
  // (Render, fase 10), vai precisar de `app.register(fastify, {
  // trustProxy: true })` pro req.ip refletir o IP real do cliente, não o
  // do proxy — revisar então.
  await app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
    // Passo 11.3, antecipado pela nota "Segurança" ("chave composta, não
    // hardcoded só para IP"): usuário autenticado compartilha o teto
    // entre dispositivos/IPs diferentes; anônimo continua por IP, único
    // identificador disponível.
    keyGenerator: (request) => request.usuarioId ?? request.ip,
    // onExceeded (não onExceeding) dispara só na requisição que de fato
    // levou o 429 — é a métrica "abuso real vs. limite mal calibrado" da
    // nota "Observabilidade", não toda requisição próxima do teto.
    onExceeded: (request) => {
      rateLimitBlockedTotal.inc({ rota: request.routeOptions.url ?? request.url });
    },
  });

  app.post<{ Body: CreateLinkBody }>(
    "/links",
    async (request, reply) => {
      const { url } = request.body ?? {};

      if (typeof url !== "string" || url.trim().length === 0) {
        return reply.status(400).send({ error: 'Campo "url" é obrigatório.' });
      }

      try {
        // request.usuarioId vem do modo opcional (onRequest, acima) —
        // undefined pra visitante anônimo, grava o link sem dono, exatamente
        // como sempre funcionou.
        const link = await linkService.createLink(url, request.usuarioId);
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

  // Passo 11.3 — "Meus links". Não existia até este passo: decisão do
  // passo 7.1 foi não montar um mecanismo de sessão anônima provisório só
  // pra descartar depois que contas existissem de verdade. Nasce direto
  // filtrada por dono, nunca lista o que não tem usuarioId (ver
  // LinkOwnershipError em link.service.ts pro mesmo raciocínio do lado do
  // PATCH).
  app.get(
    "/links",
    { preHandler: exigirUsuario },
    async (request, reply) => {
      try {
        const page = parsePagination(request.query as Record<string, unknown>);
        const links = await linkService.listByUsuario(request.usuarioId as string, page);
        return reply.send({
          links: links.map((link) => ({
            slug: link.slug,
            urlDestino: link.urlDestino,
            urlCurta: `${PUBLIC_BASE_URL}/${link.slug}`,
            ativo: link.ativo,
            criadoEm: link.criadoEm,
            expiraEm: link.expiraEm,
            status: computeStatus(link.ativo, link.expiraEm),
          })),
          page: page.page,
          pageSize: page.pageSize,
        });
      } catch (error) {
        if (error instanceof InvalidQueryError) {
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
          urlCurta: `${PUBLIC_BASE_URL}/${link.slug}`,
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
    // Passo 11.3 — modo "obrigatório": 401 sem sessão, antes de qualquer
    // outra validação. Sem login não dá nem pra checar posse.
    { preHandler: exigirUsuario },
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
        const link = await linkService.update(slug, { ativo, expiraEm }, request.usuarioId as string);
        return reply.send({ slug: link.slug, ativo: link.ativo, expiraEm: link.expiraEm });
      } catch (error) {
        if (error instanceof LinkNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidExpirationError) {
          return reply.status(400).send({ error: error.message });
        }
        if (error instanceof LinkOwnershipError) {
          return reply.status(403).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
