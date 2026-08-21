import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LinkDetalhe } from '../lib/api';
import { computeLinkStatus, formatRelative, stripProtocol, type LinkStatus } from '../lib/format';
import { ChevronRightIcon, CopyIcon, LinkIcon } from './icons';

function statusLabel(status: LinkStatus): string {
  if (status === 'ativo') return 'Ativo';
  if (status === 'desativado') return 'Desativado';
  return 'Expirado';
}

interface LinkHistoryListProps {
  links: LinkDetalhe[];
  vazioLabel?: string;
}

/**
 * Linha de histórico reaproveitada entre a seção "Últimos links" da Home
 * e a página "Meus links" (passo 11.4) — mesma lista, dois contextos.
 * O mockup da Home mostra um badge de contagem de cliques na linha, que
 * GET /links não devolve (nunca fez join com estatísticas); troquei
 * pelo badge de status (ativo/desativado/expirado), que a resposta já
 * tem de verdade — nada de inventar um número de cliques.
 */
export default function LinkHistoryList({ links, vazioLabel }: LinkHistoryListProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function handleCopy(link: LinkDetalhe) {
    try {
      await navigator.clipboard.writeText(link.urlCurta);
      setCopiedSlug(link.slug);
      setTimeout(() => setCopiedSlug((current) => (current === link.slug ? null : current)), 1500);
    } catch {
      // Clipboard indisponível — falha silenciosa, mesmo padrão de Hero.tsx.
    }
  }

  if (links.length === 0) {
    return <div className="panel-empty">{vazioLabel ?? 'Nenhum link por aqui ainda.'}</div>;
  }

  return (
    <div className="history-list">
      {links.map((link) => {
        const status = computeLinkStatus(link.ativo, link.expiraEm);
        return (
          <div className="history-row" key={link.slug}>
            <div className="history-ico">
              <LinkIcon size={16} />
            </div>
            <div className="history-urls">
              <div className="history-url-original">{link.urlDestino}</div>
              <div className="history-url-short">{stripProtocol(link.urlCurta)}</div>
            </div>
            <div className="history-date">{formatRelative(link.criadoEm)}</div>
            <div className={status === 'ativo' ? 'status-badge' : 'status-badge neutral'}>
              <div className="status-dot" />
              <div className="status-text">{statusLabel(status)}</div>
            </div>
            <button
              type="button"
              className={copiedSlug === link.slug ? 'btn-icon-sm copied' : 'btn-icon-sm'}
              onClick={() => handleCopy(link)}
              aria-label="Copiar URL curta"
            >
              <CopyIcon size={14} />
            </button>
            <Link className="btn-icon-sm" to={`/links/${link.slug}`} aria-label="Ver detalhes do link">
              <ChevronRightIcon size={14} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
