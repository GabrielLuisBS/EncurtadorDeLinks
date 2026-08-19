import { nanoid } from "nanoid";

const SLUG_LENGTH = 8;
const MAX_ATTEMPTS = 5;

interface GenerateUniqueSlugOptions<T> {
  /** Tenta persistir um registro usando o slug candidato. Deve rejeitar com o
   * erro de violação de UNIQUE do banco quando o slug já existir. */
  tryInsert: (slug: string) => Promise<T>;
  /** Reconhece se um erro capturado é uma violação de UNIQUE(slug) — e não
   * qualquer outro erro, que deve continuar propagando normalmente. */
  isUniqueConstraintViolation: (error: unknown) => boolean;
  length?: number;
  maxAttempts?: number;
}

/**
 * Gera um slug com nanoid e tenta persistir direto — sem SELECT prévio.
 * Colisão é detectada pela violação de UNIQUE(slug) no INSERT, não checada
 * antecipadamente, o que fecha a race condition entre dois requests
 * concorrentes gerando o mesmo slug (ver nota "Geração de Slug" no Obsidian).
 */
export async function generateUniqueSlug<T>({
  tryInsert,
  isUniqueConstraintViolation,
  length = SLUG_LENGTH,
  maxAttempts = MAX_ATTEMPTS,
}: GenerateUniqueSlugOptions<T>): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = nanoid(length);
    try {
      return await tryInsert(slug);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Não foi possível gerar um slug único após ${maxAttempts} tentativas.`,
  );
}
