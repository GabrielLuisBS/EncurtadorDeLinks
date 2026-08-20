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
