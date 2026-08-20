import { prisma } from "../db/prisma.js";

export const statsRepository = {
  sumTotalClicks(linkId: string) {
    return prisma.cliqueDia.aggregate({
      where: { linkId },
      _sum: { total: true },
    });
  },

  getSeries(linkId: string) {
    return prisma.cliqueDia.findMany({
      where: { linkId },
      orderBy: { dia: "asc" },
      select: { dia: true, total: true },
    });
  },

  getByDispositivo(linkId: string) {
    return prisma.cliqueDiaPorOrigem.groupBy({
      by: ["dispositivo"],
      where: { linkId },
      _sum: { total: true },
    });
  },

  getByPais(linkId: string) {
    return prisma.cliqueDiaPorOrigem.groupBy({
      by: ["pais"],
      where: { linkId },
      _sum: { total: true },
    });
  },
};
