const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// `dia`/`expiraEm` vêm como meia-noite UTC (datas puras, não instantes —
// ver nota "Modelo de Dados"). Usar getUTC*/timeZone:'UTC' evita que o
// fuso horário local empurre a data pro dia errado.
export function formatWeekday(iso: string): string {
  return WEEKDAYS[new Date(iso).getUTCDay()];
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatDayMonthYear(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' });
  const month = date
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
  return `${day} ${month} ${date.getUTCFullYear()}`;
}

// `criadoEm` é um instante real (DateTime, não data pura) — aqui sim faz
// sentido mostrar no fuso horário local de quem está olhando.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '');
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

export function formatRelative(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return 'hoje';
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
}

export type LinkStatus = 'ativo' | 'desativado' | 'expirado';

/**
 * Mesma lógica de link.service.ts (computeStatus) no back — recalculada
 * aqui em vez de confiar no campo `status` da resposta, que só reflete o
 * momento da carga: depois de um PATCH (ativo ou expiraEm), o `status`
 * antigo ficaria desatualizado se não recomputado a partir do estado atual.
 */
export function computeLinkStatus(ativo: boolean, expiraEm: string | null): LinkStatus {
  if (!ativo) return 'desativado';
  if (expiraEm && new Date(expiraEm).getTime() <= Date.now()) return 'expirado';
  return 'ativo';
}
