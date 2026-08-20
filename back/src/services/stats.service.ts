import { redis } from "../db/redis.js";
import { linkRepository } from "../repositories/link.repository.js";
import { statsRepository } from "../repositories/stats.repository.js";
import type { Pagination, PeriodRange } from "../utils/stats-query.js";
import { LinkNotFoundError, computeStatus, linkService } from "./link.service.js";

export { LinkNotFoundError };

const RESUMO_CACHE_KEY = "stats:resumo";
// Curto de propósito: é a mesma resposta pra todo visitante da Home, então
// o objetivo é só absorver rajadas de tráfego na home, não servir um
// número desatualizado por muito tempo (ver "Dashboard").
const RESUMO_CACHE_TTL_SECONDS = 60;

async function requireLink(slug: string) {
  return linkService.getBySlug(slug);
}

/**
 * Todo endpoint aqui lê exclusivamente de CliqueDia / CliqueDiaPorOrigem /
 * CliqueDiaPorReferer (agregados) — nunca de Clique bruto. Ver nota
 * "Dashboard" no Obsidian: "Nunca: Dashboard → milhares de registros de
 * Clique → gráfico". Filtros de período/dimensão e paginação são
 * resolvidos e validados na camada de rota (stats-query.ts) antes de
 * chegar aqui — o Service recebe valores já validados, não query params.
 */
export const statsService = {
  /**
   * Resumo global pros 3 cards da Home. Sem "usuários" de propósito — não
   * existe tabela de usuário antes da fase 11 (ver "Roteiro de Execução");
   * o campo só entra quando essa fase existir de verdade, não como null
   * inventado agora. Cacheado no Redis com TTL curto porque é a mesma
   * resposta pra todo visitante — não há por quê recalcular a cada request.
   */
  async getResumo(): Promise<{ totalLinks: number; totalCliques: number }> {
    const cached = await redis.get(RESUMO_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as { totalLinks: number; totalCliques: number };
    }

    const [totalLinks, cliquesAgg] = await Promise.all([
      linkRepository.count(),
      statsRepository.sumAllTimeClicksGlobal(),
    ]);

    const resumo = {
      totalLinks,
      totalCliques: cliquesAgg._sum.total ?? 0,
    };

    await redis.set(RESUMO_CACHE_KEY, JSON.stringify(resumo), "EX", RESUMO_CACHE_TTL_SECONDS);
    return resumo;
  },

  async getSummary(slug: string, range: PeriodRange) {
    const link = await requireLink(slug);
    const [allTime, noPeriodo] = await Promise.all([
      statsRepository.sumAllTimeClicks(link.id),
      statsRepository.sumClicksInPeriod(link.id, range),
    ]);

    return {
      slug: link.slug,
      totalCliques: allTime._sum.total ?? 0,
      cliquesNoPeriodo: noPeriodo._sum.total ?? 0,
      criadoEm: link.criadoEm,
      expiraEm: link.expiraEm,
      status: computeStatus(link.ativo, link.expiraEm),
    };
  },

  async getSeries(slug: string, range: PeriodRange) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getSeries(link.id, range);
    return rows.map((r) => ({ dia: r.dia, total: r.total }));
  },

  async getByDispositivo(
    slug: string,
    range: PeriodRange,
    pais: string | undefined,
    page: Pagination,
  ) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getByDispositivo(link.id, range, pais, page);
    return {
      page: page.page,
      pageSize: page.pageSize,
      items: rows.map((r) => ({ dispositivo: r.dispositivo, total: r._sum.total ?? 0 })),
    };
  },

  async getByPais(
    slug: string,
    range: PeriodRange,
    dispositivo: string | undefined,
    page: Pagination,
  ) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getByPais(link.id, range, dispositivo, page);
    return {
      page: page.page,
      pageSize: page.pageSize,
      items: rows.map((r) => ({ pais: r.pais || "desconhecido", total: r._sum.total ?? 0 })),
    };
  },

  async getByReferer(slug: string, range: PeriodRange, page: Pagination) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getByReferer(link.id, range, page);
    return {
      page: page.page,
      pageSize: page.pageSize,
      items: rows.map((r) => ({ referer: r.referer || "direto", total: r._sum.total ?? 0 })),
    };
  },
};
