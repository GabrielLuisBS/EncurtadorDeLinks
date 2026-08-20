import { redis } from "../db/redis.js";
import type { Dispositivo } from "../utils/click-context.js";

const STREAM_KEY = "cliques:eventos";

export interface ClickEvent {
  linkId: string;
  /** ISO 8601 — momento do acesso, não do processamento (ver "Registro de Cliques"). */
  quando: string;
  pais: string | null;
  referer: string | null;
  dispositivo: Dispositivo;
}

/**
 * Publica eventos de clique num Redis Stream — reaproveita o Redis que
 * já existe para cache em vez de introduzir um broker novo (ver
 * "Registro de Cliques" no Obsidian). O worker que consome (fase 4.2)
 * grava em Clique de forma assíncrona.
 */
export const clickQueueService = {
  async publish(event: ClickEvent): Promise<void> {
    await redis.xadd(
      STREAM_KEY,
      "*",
      "linkId",
      event.linkId,
      "quando",
      event.quando,
      "pais",
      event.pais ?? "",
      "referer",
      event.referer ?? "",
      "dispositivo",
      event.dispositivo,
    );
  },
};

export { STREAM_KEY };
