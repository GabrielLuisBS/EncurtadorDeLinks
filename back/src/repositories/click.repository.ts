import { prisma } from "../db/prisma.js";

interface CreateClickInput {
  linkId: string;
  quando: Date;
  pais: string | null;
  referer: string | null;
  dispositivo: string;
}

export const clickRepository = {
  create(data: CreateClickInput) {
    return prisma.clique.create({ data });
  },
};
