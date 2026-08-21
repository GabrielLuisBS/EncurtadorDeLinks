import { Counter, Histogram, Registry } from "prom-client";

/**
 * As quatro métricas da nota "Observabilidade" do Obsidian que têm uma
 * pergunta operacional concreta por trás (latência do redirect, cache
 * hit/miss, tempo do job diário, rate limit) — não instrumentamos tudo
 * que é possível medir, só o que responde a uma dessas perguntas.
 */
export const metricsRegistry = new Registry();

export const redirectLatencySeconds = new Histogram({
  name: "linkly_redirect_latency_seconds",
  help: "Latência de GET /:slug, do início do handler até a resposta.",
  labelNames: ["resultado"] as const,
  // Faixa pensada para separar HIT de Redis (~ms) de MISS no Postgres
  // (~dezenas de ms) — ver nota "Cache e Redis".
  buckets: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [metricsRegistry],
});

export const cacheLookupsTotal = new Counter({
  name: "linkly_cache_lookups_total",
  help: "Leituras de link:{slug} no Redis, por resultado (hit/miss).",
  labelNames: ["resultado"] as const,
  registers: [metricsRegistry],
});

export const aggregateDailyDurationSeconds = new Histogram({
  name: "linkly_aggregate_daily_duration_seconds",
  help: "Duração de uma execução do job de agregação diária.",
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const rateLimitBlockedTotal = new Counter({
  name: "linkly_rate_limit_blocked_total",
  help: "Requisições bloqueadas por rate limit, por rota.",
  labelNames: ["rota"] as const,
  registers: [metricsRegistry],
});
