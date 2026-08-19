import { redis } from "../db/redis.js";

const DEFAULT_TTL_SECONDS = 300;

export interface CachedLink {
  urlDestino: string;
  ativo: boolean;
  /** ISO 8601, ou null se o link não expira — JSON não tem tipo Date. */
  expiraEm: string | null;
}

function keyFor(slug: string): string {
  return `link:${slug}`;
}

/**
 * Cache-aside da chave link:{slug}. Guarda urlDestino + ativo + expiraEm
 * juntos (não só a URL) para que o handler de redirecionamento consiga
 * barrar um link desativado/expirado mesmo em cache HIT, sem tocar no
 * banco — ver nota "Cache e Redis" no Obsidian.
 */
export const cacheService = {
  async get(slug: string): Promise<CachedLink | null> {
    const raw = await redis.get(keyFor(slug));
    if (!raw) return null;
    return JSON.parse(raw) as CachedLink;
  },

  async set(
    slug: string,
    data: CachedLink,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    await redis.set(keyFor(slug), JSON.stringify(data), "EX", ttlSeconds);
  },

  async del(slug: string): Promise<void> {
    await redis.del(keyFor(slug));
  },
};
