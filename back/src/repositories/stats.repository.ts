import { prisma } from "../db/prisma.js";
import type { Pagination, PeriodRange } from "../utils/stats-query.js";

export const statsRepository = {
  sumAllTimeClicks(linkId: string) {
    return prisma.cliqueDia.aggregate({
      where: { linkId },
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
