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
    // Passo 11.3: POST /links grava o dono quando há sessão. Sem
    // "include" o navegador nunca manda o cookie entre origens
    // diferentes (Vercel → Render), e o link nasceria sempre sem dono
    // mesmo com o usuário logado.
    credentials: 'include',
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
  /** Passo 11.4 — dono da sessão atual. Sempre false pra visitante
   * anônimo ou link sem dono. Decide se as configurações do link
   * aparecem editáveis na tela de detalhe. */
  dono: boolean;
}

export async function getLink(slug: string): Promise<LinkDetalhe> {
  // "include" pra o back conseguir calcular "dono" corretamente — sem
  // mandar o cookie, todo mundo pareceria visitante anônimo.
  const response = await fetch(`${API_URL}/links/${slug}`, { credentials: 'include' });
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
  // Passo 11.3: PATCH exige sessão (401 sem "include") e checa posse
  // (403 se a sessão não for a dona) — ver LinkDetalhe.tsx, que só
  // mostra os controles quando link.dono é true, então esta chamada só
  // deveria ser possível de disparar por quem já sabe que tem permissão.
  const response = await fetch(`${API_URL}/links/${slug}`, {
    method: 'PATCH',
    credentials: 'include',
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

// ---- Autenticação (passo 11.2/11.4) ----

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  /** Passo 11.4 (verificação de e-mail) — não bloqueia nada no produto,
   * só decide se o banner de "confirme seu e-mail" aparece. */
  emailVerificado: boolean;
}

async function postAuth<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Não foi possível completar a operação.'));
  }
  return data as T;
}

export function registrar(nome: string, email: string, senha: string): Promise<Usuario> {
  return postAuth('/auth/registrar', { nome, email, senha });
}

export function login(email: string, senha: string): Promise<Usuario> {
  return postAuth('/auth/login', { email, senha });
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
}

/** Chamado pela página /verificar-email com o token da query string do
 * link recebido por e-mail. */
export function verificarEmail(token: string): Promise<Usuario> {
  return postAuth('/auth/verificar-email', { token });
}

export async function reenviarVerificacao(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/reenviar-verificacao`, {
    method: 'POST',
    credentials: 'include',
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Não foi possível reenviar o e-mail.'));
  }
}

/**
 * `null` cobre tanto "nunca logou" quanto "sessão expirou" quanto
 * "back fora do ar" — a navbar trata os três do mesmo jeito (mostra o
 * estado deslogado), não é um ApiError porque 401 aqui é o caminho
 * normal da vida, não uma falha.
 */
export async function getMe(): Promise<Usuario | null> {
  const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!response.ok) return null;
  return (await response.json()) as Usuario;
}

export interface MeusLinksResult {
  links: LinkDetalhe[];
  page: number;
  pageSize: number;
}

/** "Meus links" (passo 11.4) e a seção "Últimos links" da Home — mesmo
 * GET /links, exige sessão (o chamador decide o que fazer com o 401).
 * `pageSize` opcional: a Home pede uma prévia pequena, "Meus links" usa
 * o default do back (20). */
export async function getMeusLinks(page: number = 1, pageSize?: number): Promise<MeusLinksResult> {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize !== undefined) params.set('pageSize', String(pageSize));
  const response = await fetch(`${API_URL}/links?${params.toString()}`, { credentials: 'include' });
  if (!response.ok) {
    throw new ApiError('Não foi possível carregar seus links.');
  }
  return (await response.json()) as MeusLinksResult;
}
