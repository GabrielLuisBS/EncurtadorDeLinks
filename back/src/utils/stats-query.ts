export class InvalidQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQueryError";
  }
}

const MAX_PERIOD_DAYS = 90;
const PERIOD_PRESETS = new Set(["7", "30", "90"]);
const DISPOSITIVOS = new Set(["mobile", "desktop", "tablet", "outro"]);
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MS_PER_DAY = 86_400_000;

export interface PeriodRange {
  /** início do primeiro dia incluído, meia-noite UTC */
  start: Date;
  /** meia-noite UTC do dia seguinte ao último incluído — limite exclusivo */
  end: Date;
}

type Query = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : String(value);
}

function parseDateOnly(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidQueryError(`"${field}" deve estar no formato AAAA-MM-DD.`);
  }
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) {
    throw new InvalidQueryError(`"${field}" não é uma data válida.`);
  }
  return date;
}

/**
 * Resolve o período do request: "dataInicial"+"dataFinal" explícitos, ou
 * o preset "periodo" (7/30/90 dias), ou o default (90 dias). O teto de
 * 90 dias vale nos dois casos — não é só o preset, um range explícito
 * também não pode ultrapassar — ver "Segurança": "período máximo por
 * request" existe pra evitar que um filtro de datas vire, ele mesmo, um
 * vetor de consulta pesada.
 */
export function parsePeriod(query: Query): PeriodRange {
  const dataInicial = asString(query.dataInicial);
  const dataFinal = asString(query.dataFinal);
  const periodo = asString(query.periodo);

  if (dataInicial || dataFinal) {
    if (!dataInicial || !dataFinal) {
      throw new InvalidQueryError('Informe "dataInicial" e "dataFinal" juntos.');
    }
    const start = parseDateOnly(dataInicial, "dataInicial");
    const endDay = parseDateOnly(dataFinal, "dataFinal");
    const end = new Date(endDay.getTime() + MS_PER_DAY);
    if (start >= end) {
      throw new InvalidQueryError('"dataInicial" deve ser anterior ou igual a "dataFinal".');
    }
    const spanDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
    if (spanDays > MAX_PERIOD_DAYS) {
      throw new InvalidQueryError(`O período não pode exceder ${MAX_PERIOD_DAYS} dias.`);
    }
    return { start, end };
  }

  if (periodo !== undefined && !PERIOD_PRESETS.has(periodo)) {
    throw new InvalidQueryError('"periodo" deve ser 7, 30 ou 90.');
  }
  const days = periodo ? Number(periodo) : MAX_PERIOD_DAYS;
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end.getTime() - days * MS_PER_DAY);
  return { start, end };
}

export function parseDispositivo(query: Query): string | undefined {
  const dispositivo = asString(query.dispositivo);
  if (dispositivo === undefined) return undefined;
  if (!DISPOSITIVOS.has(dispositivo)) {
    throw new InvalidQueryError('"dispositivo" deve ser mobile, desktop, tablet ou outro.');
  }
  return dispositivo;
}

export function parsePais(query: Query): string | undefined {
  const pais = asString(query.pais);
  if (pais === undefined) return undefined;
  if (pais.length === 0 || pais.length > 100) {
    throw new InvalidQueryError('"pais" deve ter entre 1 e 100 caracteres.');
  }
  return pais;
}

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(query: Query): Pagination {
  const pageRaw = asString(query.page);
  const pageSizeRaw = asString(query.pageSize);
  const page = pageRaw !== undefined ? Number(pageRaw) : 1;
  const pageSize = pageSizeRaw !== undefined ? Number(pageSizeRaw) : DEFAULT_PAGE_SIZE;

  if (!Number.isInteger(page) || page < 1) {
    throw new InvalidQueryError('"page" deve ser um número inteiro maior ou igual a 1.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new InvalidQueryError(`"pageSize" deve ser um número inteiro entre 1 e ${MAX_PAGE_SIZE}.`);
  }
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
