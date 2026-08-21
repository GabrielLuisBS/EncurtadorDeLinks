const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export class ApiError extends Error {}

function extractErrorMessage(data: unknown, fallback: string): string {
  return data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
    ? data.error
    : fallback;
}

export interface CreateLinkResult {
  slug: string;
  urlCurta: string;
}

export async function createLink(url: string): Promise<CreateLinkResult> {
  const response = await fetch(`${API_URL}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Não foi possível encurtar o link.'));
  }

  return data as CreateLinkResult;
}

export interface Resumo {
  totalLinks: number;
  totalCliques: number;
}

export async function getResumo(): Promise<Resumo> {
  const response = await fetch(`${API_URL}/stats/resumo`);
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar o resumo.');
  }
  return (await response.json()) as Resumo;
}

export type Periodo = 7 | 30 | 90;

export interface SeriePonto {
  dia: string;
  total: number;
}

/**
 * Série global (soma entre todos os links) pro gráfico de linha da tela de
 * Estatísticas — não é a série de um link específico.
 */
export async function getSeriesGlobal(periodo: Periodo): Promise<SeriePonto[]> {
  const response = await fetch(`${API_URL}/stats/series?periodo=${periodo}`);
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar a série de cliques.');
  }
  return (await response.json()) as SeriePonto[];
}

export interface DispositivoPonto {
  dispositivo: string;
  total: number;
}

/** Distribuição por dispositivo global (soma entre todos os links) pro
 * donut da tela de Estatísticas. */
export async function getByDispositivoGlobal(periodo: Periodo): Promise<DispositivoPonto[]> {
  const response = await fetch(`${API_URL}/stats/por-dispositivo?periodo=${periodo}`);
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar a distribuição por dispositivo.');
  }
  return (await response.json()) as DispositivoPonto[];
}

export type LinkStatus = 'ativo' | 'desativado' | 'expirado';

export interface LinkDetalhe {
  slug: string;
  urlDestino: string;
  urlCurta: string;
  ativo: boolean;
  criadoEm: string;
  expiraEm: string | null;
  status: LinkStatus;
}

export async function getLink(slug: string): Promise<LinkDetalhe> {
  const response = await fetch(`${API_URL}/links/${slug}`);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Não foi possível carregar o link.'));
  }
  return data as LinkDetalhe;
}

export interface LinkStatsSummary {
  slug: string;
  totalCliques: number;
  cliquesNoPeriodo: number;
  criadoEm: string;
  expiraEm: string | null;
  status: LinkStatus;
}

export async function getLinkStats(slug: string, periodo: Periodo): Promise<LinkStatsSummary> {
  const response = await fetch(`${API_URL}/links/${slug}/stats?periodo=${periodo}`);
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar as estatísticas do link.');
  }
  return (await response.json()) as LinkStatsSummary;
}

/** Série de um link específico — diferente de getSeriesGlobal (que soma
 * entre todos os links, usada na tela de Estatísticas). */
export async function getLinkSeries(slug: string, periodo: Periodo): Promise<SeriePonto[]> {
  const response = await fetch(`${API_URL}/links/${slug}/stats/series?periodo=${periodo}`);
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar a série de cliques do link.');
  }
  return (await response.json()) as SeriePonto[];
}

export interface UpdateLinkInput {
  ativo?: boolean;
  expiraEm?: string | null;
}

export interface UpdateLinkResult {
  slug: string;
  ativo: boolean;
  expiraEm: string | null;
}

export async function updateLink(slug: string, input: UpdateLinkInput): Promise<UpdateLinkResult> {
  const response = await fetch(`${API_URL}/links/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Não foi possível atualizar o link.'));
  }
  return data as UpdateLinkResult;
}

export function qrCodeUrl(slug: string): string {
  return `${API_URL}/links/${slug}/qrcode`;
}
