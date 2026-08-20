import type { Link } from "../generated/prisma/client.js";
import { linkRepository } from "../repositories/link.repository.js";
import { cacheService } from "./cache.service.js";
import { generateUniqueSlug } from "./slug.js";

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class InvalidUrlError extends Error {
  constructor(reason: string) {
    super(`URL inválida: ${reason}`);
    this.name = "InvalidUrlError";
  }
}

export class LinkNotFoundError extends Error {
  constructor() {
    super("Link não encontrado.");
    this.name = "LinkNotFoundError";
  }
}

export type LinkStatus = "ativo" | "desativado" | "expirado";

/**
 * Deriva o status visível (ativo/desativado/expirado) a partir dos campos
 * brutos do Link. Única fonte da verdade — usada tanto no resumo de
 * estatísticas (stats.service.ts) quanto na leitura de metadados do link.
 */
export function computeStatus(ativo: boolean, expiraEm: Date | null): LinkStatus {
  if (!ativo) return "desativado";
  if (expiraEm && expiraEm.getTime() <= Date.now()) return "expirado";
  return "ativo";
}

function validateUrl(rawUrl: string): void {
  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(`excede o tamanho máximo de ${MAX_URL_LENGTH} caracteres`);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidUrlError("formato de URL não reconhecido");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidUrlError(
      `esquema "${parsed.protocol}" não permitido — use http ou https`,
    );
  }
}

export const linkService = {
  /**
   * Valida a URL e cria o Link com um slug único. Não sabe o que é HTTP —
   * a rota (fase 2.3) traduz InvalidUrlError para 400 e monta a resposta.
   */
  async createLink(urlDestino: string): Promise<Link> {
    validateUrl(urlDestino);

    return generateUniqueSlug({
      tryInsert: (slug) => linkRepository.create({ slug, urlDestino }),
      isUniqueConstraintViolation: linkRepository.isUniqueSlugViolation,
    });
  },

  async getBySlug(slug: string): Promise<Link> {
    const link = await linkRepository.findBySlug(slug);
    if (!link) {
      throw new LinkNotFoundError();
    }
    return link;
  },

  /**
   * Ativa/desativa o link e invalida o cache Redis (`DEL link:{slug}`) como
   * parte da mesma operação — sem isso, um link recém-desativado continuaria
   * respondendo 302 até o TTL do cache expirar (ver "Funcionalidades do
   * Link" no Obsidian).
   */
  async setAtivo(slug: string, ativo: boolean): Promise<Link> {
    const link = await linkService.getBySlug(slug);
    const updated = await linkRepository.setAtivo(link.id, ativo);
    await cacheService.del(slug);
    return updated;
  },
};
