import { prisma } from "../db/prisma.js";
import type { Pagination, PeriodRange } from "../utils/stats-query.js";

export const statsRepository = {
  sumAllTimeClicks(linkId: string) {
    return prisma.cliqueDia.aggregate({
      where: { linkId },
      _sum: { total: true },
    });
  },

  /**
   * Mesma agregação de sumAllTimeClicks, mas sem filtro de linkId — soma
   * CliqueDia de todos os links. Nunca conta Clique bruto (ver nota
   * "Dashboard": "Nunca: Dashboard → milhares de registros de Clique →
   * gráfico"), a mesma regra vale pro resumo global.
   */
  sumAllTimeClicksGlobal() {
    return prisma.cliqueDia.aggregate({
      _sum: { total: true },
    });
  },

  sumClicksInPeriod(linkId: string, range: PeriodRange) {
    return prisma.cliqueDia.aggregate({
      where: { linkId, dia: { gte: range.start, lt: range.end } },
      _sum: { total: true },
    });
  },

  getSeries(linkId: string, range: PeriodRange) {
    return prisma.cliqueDia.findMany({
      where: { linkId, dia: { gte: range.start, lt: range.end } },
      orderBy: { dia: "asc" },
      select: { dia: true, total: true },
    });
  },

  /**
   * Mesma série, mas somada entre todos os links — pro gráfico de linha
   * global da Tela - Estatísticas (a página não é de um link específico).
   * Sem privacidade em jogo: é uma soma agregada por dia, não expõe qual
   * link é qual (ao contrário do ranking "links mais acessados", adiado
   * pra fase 11 — ver Roteiro de Execução).
   */
  getSeriesGlobal(range: PeriodRange) {
    return prisma.cliqueDia.groupBy({
      by: ["dia"],
      where: { dia: { gte: range.start, lt: range.end } },
      _sum: { total: true },
      orderBy: { dia: "asc" },
    });
  },

  /**
   * Mesmo agrupamento, sem linkId — pro donut de dispositivo da Tela -
   * Estatísticas (não é a página de um link específico). Só 4 categorias
   * possíveis (mobile/desktop/tablet/outro), então sem paginação — ao
   * contrário da versão por link, aqui não faria sentido.
   */
  getByDispositivoGlobal(range: PeriodRange) {
    return prisma.cliqueDiaPorOrigem.groupBy({
      by: ["dispositivo"],
      where: { dia: { gte: range.start, lt: range.end } },
      _sum: { total: true },
      orderBy: { dispositivo: "asc" },
    });
  },

  getByDispositivo(linkId: string, range: PeriodRange, pais: string | undefined, page: Pagination) {
    return prisma.cliqueDiaPorOrigem.groupBy({
      by: ["dispositivo"],
      where: {
        linkId,
        dia: { gte: range.start, lt: range.end },
        ...(pais !== undefined ? { pais } : {}),
      },
      _sum: { total: true },
      orderBy: { dispositivo: "asc" },
      skip: page.skip,
      take: page.take,
    });
  },

  getByPais(
    linkId: string,
    range: PeriodRange,
    dispositivo: string | undefined,
    page: Pagination,
  ) {
    return prisma.cliqueDiaPorOrigem.groupBy({
      by: ["pais"],
      where: {
        linkId,
        dia: { gte: range.start, lt: range.end },
        ...(dispositivo !== undefined ? { dispositivo } : {}),
      },
      _sum: { total: true },
      orderBy: { pais: "asc" },
      skip: page.skip,
      take: page.take,
    });
  },

  getByReferer(linkId: string, range: PeriodRange, page: Pagination) {
    return prisma.cliqueDiaPorReferer.groupBy({
      by: ["referer"],
      where: { linkId, dia: { gte: range.start, lt: range.end } },
      _sum: { total: true },
      orderBy: { referer: "asc" },
      skip: page.skip,
      take: page.take,
    });
  },
};
