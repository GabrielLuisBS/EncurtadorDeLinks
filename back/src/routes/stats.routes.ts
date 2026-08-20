import type { FastifyInstance } from "fastify";
import { LinkNotFoundError, statsService } from "../services/stats.service.js";

interface StatsParams {
  slug: string;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get<{ Params: StatsParams }>("/links/:slug/stats", async (request, reply) => {
    try {
      return await statsService.getSummary(request.params.slug);
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Params: StatsParams }>("/links/:slug/stats/series", async (request, reply) => {
    try {
      return await statsService.getSeries(request.params.slug);
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Params: StatsParams }>(
    "/links/:slug/stats/por-dispositivo",
    async (request, reply) => {
      try {
        return await statsService.getByDispositivo(request.params.slug);
      } catch (error) {
        if (error instanceof LinkNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: StatsParams }>("/links/:slug/stats/por-pais", async (request, reply) => {
    try {
      return await statsService.getByPais(request.params.slug);
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
