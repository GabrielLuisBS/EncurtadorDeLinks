import { Prisma } from "../generated/prisma/client.js";
import type { Link } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

interface CreateLinkInput {
  slug: string;
  urlDestino: string;
}

export const linkRepository = {
  create(data: CreateLinkInput): Promise<Link> {
    return prisma.link.create({ data });
  },

  findBySlug(slug: string): Promise<Link | null> {
    return prisma.link.findUnique({ where: { slug } });
  },

  /**
   * Reconhece especificamente a violação de UNIQUE(slug) — não qualquer
   * P2002 (a constraint poderia, no futuro, cobrir outro campo).
   */
  isUniqueSlugViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }
    if (error.code !== "P2002") {
      return false;
    }
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target : [target];
    return fields.includes("slug");
  },
};
