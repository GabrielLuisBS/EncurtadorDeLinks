import { redis } from "../db/redis.js";
import { cacheLookupsTotal } from "../metrics.js";

const DEFAULT_TTL_SECONDS = 300;

// Só para o benchmark Redis OFF vs ON do passo 9.1 (ver nota
// "Observabilidade"): força toda leitura a errar, empurrando o
// redirecionamento para o caminho do Postgres em cada requisição. Não é
// uma feature de produto — fica desligado (false) por padrão.
const disableCacheRead = process.env.BENCHMARK_DISABLE_CACHE_READ === "true";

export interface CachedLink {
  linkId: string;
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
    if (disableCacheRead) {
      cacheLookupsTotal.inc({ resultado: "miss" });
      return null;
    }

    const raw = await redis.get(keyFor(slug));
    cacheLookupsTotal.inc({ resultado: raw ? "hit" : "miss" });
    if (!raw) return null;
    return JSON.parse(raw) as CachedLink;
  },

  async set(
    slug: string,
    data: CachedLink,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    // Sem isto, o modo Redis OFF do benchmark pagaria o custo de um SET a
    // mais por requisição (a cada MISS forçado) sem nenhum efeito no
    // resultado — o próximo GET nunca lê o valor, porque get() já
    // retorna null incondicionalmente.
    if (disableCacheRead) return;
    await redis.set(keyFor(slug), JSON.stringify(data), "EX", ttlSeconds);
  },

  async del(slug: string): Promise<void> {
    await redis.del(keyFor(slug));
  },
};
