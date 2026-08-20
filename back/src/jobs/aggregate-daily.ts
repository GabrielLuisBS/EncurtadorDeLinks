import "dotenv/config";
import { pathToFileURL } from "node:url";
import { prisma } from "../db/prisma.js";

interface DayRange {
  start: Date;
  end: Date;
  day: Date;
}

function dayRangeUTC(reference: Date): DayRange {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const d = reference.getUTCDate();
  const start = new Date(Date.UTC(y, m, d));
  const end = new Date(Date.UTC(y, m, d + 1));
  return { start, end, day: start };
}

function yesterdayUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
}

/**
 * Agrega Clique em CliqueDia para um único dia (limites em UTC).
 *
 * Idempotente por construção: cada execução recalcula o total do zero a
 * partir de Clique (não incrementa um valor existente) e faz UPSERT
 * apoiado em UNIQUE(linkId, dia) — rodar duas vezes para o mesmo dia
 * produz o mesmo resultado, nunca duplica. Ver nota "Agregação Diária"
 * no Obsidian.
 *
 * `targetDay` é opcional pra permitir reprocessamento manual de um dia
 * específico; por padrão processa "ontem" (o dia anterior fechado),
 * nunca o dia corrente, que ainda está recebendo cliques.
 */
export async function aggregateDay(
  targetDay: Date = yesterdayUTC(new Date()),
): Promise<{ dia: Date; linksProcessed: number }> {
  const { start, end, day } = dayRangeUTC(targetDay);

  const groups = await prisma.clique.groupBy({
    by: ["linkId"],
    where: { quando: { gte: start, lt: end } },
    _count: { _all: true },
  });

  for (const group of groups) {
    await prisma.cliqueDia.upsert({
      where: { linkId_dia: { linkId: group.linkId, dia: day } },
      update: { total: group._count._all },
      create: { linkId: group.linkId, dia: day, total: group._count._all },
    });
  }

  return { dia: day, linksProcessed: groups.length };
}

// Permite rodar como script standalone (npm run job:aggregate) sem
// disparar a agregação quando o arquivo é só importado (ex.: nos testes).
const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  aggregateDay()
    .then(async (result) => {
      console.log(
        `[aggregate-daily] dia ${result.dia.toISOString().slice(0, 10)}: ${result.linksProcessed} link(s) processado(s).`,
      );
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("[aggregate-daily] erro:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
