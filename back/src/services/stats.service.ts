import { linkRepository } from "../repositories/link.repository.js";
import { statsRepository } from "../repositories/stats.repository.js";

export class LinkNotFoundError extends Error {
  constructor() {
    super("Link não encontrado.");
    this.name = "LinkNotFoundError";
  }
}

type LinkStatus = "ativo" | "desativado" | "expirado";

function computeStatus(ativo: boolean, expiraEm: Date | null): LinkStatus {
  if (!ativo) return "desativado";
  if (expiraEm && expiraEm.getTime() <= Date.now()) return "expirado";
  return "ativo";
}

async function requireLink(slug: string) {
  const link = await linkRepository.findBySlug(slug);
  if (!link) {
    throw new LinkNotFoundError();
  }
  return link;
}

/**
 * Todo endpoint aqui lê exclusivamente de CliqueDia / CliqueDiaPorOrigem
 * (agregados) — nunca de Clique bruto. Ver nota "Dashboard" no Obsidian:
 * "Nunca: Dashboard → milhares de registros de Clique → gráfico".
 */
export const statsService = {
  async getSummary(slug: string) {
    const link = await requireLink(slug);
    const { _sum } = await statsRepository.sumTotalClicks(link.id);

    return {
      slug: link.slug,
      totalCliques: _sum.total ?? 0,
      criadoEm: link.criadoEm,
      expiraEm: link.expiraEm,
      status: computeStatus(link.ativo, link.expiraEm),
    };
  },

  async getSeries(slug: string) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getSeries(link.id);
    return rows.map((r) => ({ dia: r.dia, total: r.total }));
  },

  async getByDispositivo(slug: string) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getByDispositivo(link.id);
    return rows.map((r) => ({ dispositivo: r.dispositivo, total: r._sum.total ?? 0 }));
  },

  async getByPais(slug: string) {
    const link = await requireLink(slug);
    const rows = await statsRepository.getByPais(link.id);
    return rows.map((r) => ({ pais: r.pais || "desconhecido", total: r._sum.total ?? 0 }));
  },
};
