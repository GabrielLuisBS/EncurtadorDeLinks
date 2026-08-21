const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export class ApiError extends Error {}

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
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Não foi possível encurtar o link.';
    throw new ApiError(message);
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
