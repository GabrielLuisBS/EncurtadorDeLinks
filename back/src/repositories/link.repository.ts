import { Prisma } from "../generated/prisma/client.js";
import type { Link } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import type { Pagination } from "../utils/stats-query.js";

interface CreateLinkInput {
  slug: string;
  urlDestino: string;
  /** undefined (não coluna NULL explícita) quando criado sem sessão —
   * Prisma trata "não informado" como não setar a coluna, que aqui tem
   * default implícito NULL por ser nullable. Mesmo resultado, forma
   * mais direta de expressar "sem dono" na chamada. */
  usuarioId?: string;
}

export const linkRepository = {
  create(data: CreateLinkInput): Promise<Link> {
    return prisma.link.create({ data });
  },

  findBySlug(slug: string): Promise<Link | null> {
    return prisma.link.findUnique({ where: { slug } });
  },

  /** Passo 11.3 — sustenta "Meus links": só links com usuarioId igual ao
   * da sessão, nunca os sem dono (ver decisão em link.service.ts). Ordem
   * e filtro combinados usam o índice (usuarioId, criadoEm) do passo
   * 11.1 direto, sem sort separado. */
  findManyByUsuario(usuarioId: string, page: Pagination): Promise<Link[]> {
    return prisma.link.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      skip: page.skip,
      take: page.take,
    });
  },

  count(): Promise<number> {
    return prisma.link.count();
  },

  update(id: string, data: { ativo?: boolean; expiraEm?: Date | null }): Promise<Link> {
    return prisma.link.update({ where: { id }, data });
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
