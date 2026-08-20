import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply } from "fastify";
import { LinkNotFoundError, statsService } from "../services/stats.service.js";
import {
  InvalidQueryError,
  parseDispositivo,
  parsePagination,
  parsePais,
  parsePeriod,
} from "../utils/stats-query.js";

interface StatsParams {
  slug: string;
}

function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof LinkNotFoundError) {
    return reply.status(404).send({ error: error.message });
  }
  if (error instanceof InvalidQueryError) {
    return reply.status(400).send({ error: error.message });
  }
  throw error;
}

export async function statsRoutes(app: FastifyInstance) {
  // Escopado a este plugin, igual ao de linksRoutes. Leitura, mas agregada
  // (groupBy + paginação) — mais caro por request que o QR code, por isso
  // um teto mais conservador que os 60/min de leitura simples. Mitiga
  // "scraping/consulta excessiva do painel" (ver nota "Segurança").
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  app.get<{ Params: StatsParams }>("/links/:slug/stats", async (request, reply) => {
    try {
      const range = parsePeriod(request.query as Record<string, unknown>);
      return await statsService.getSummary(request.params.slug, range);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get<{ Params: StatsParams }>("/links/:slug/stats/series", async (request, reply) => {
    try {
      const range = parsePeriod(request.query as Record<string, unknown>);
      return await statsService.getSeries(request.params.slug, range);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get<{ Params: StatsParams }>(
    "/links/:slug/stats/por-dispositivo",
    async (request, reply) => {
      try {
        const query = request.query as Record<string, unknown>;
        const range = parsePeriod(query);
        const pais = parsePais(query);
        const page = parsePagination(query);
        return await statsService.getByDispositivo(request.params.slug, range, pais, page);
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  app.get<{ Params: StatsParams }>("/links/:slug/stats/por-pais", async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const range = parsePeriod(query);
      const dispositivo = parseDispositivo(query);
      const page = parsePagination(query);
      return await statsService.getByPais(request.params.slug, range, dispositivo, page);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get<{ Params: StatsParams }>("/links/:slug/stats/por-referer", async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const range = parsePeriod(query);
      const page = parsePagination(query);
      return await statsService.getByReferer(request.params.slug, range, page);
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
