import type { Link } from "../generated/prisma/client.js";
import { linkRepository } from "../repositories/link.repository.js";
import { generateUniqueSlug } from "./slug.js";

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class InvalidUrlError extends Error {
  constructor(reason: string) {
    super(`URL inválida: ${reason}`);
    this.name = "InvalidUrlError";
  }
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
};
