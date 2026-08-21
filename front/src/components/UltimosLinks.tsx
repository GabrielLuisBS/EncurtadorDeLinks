import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMeusLinks, type LinkDetalhe } from '../lib/api';
import LinkHistoryList from './LinkHistoryList';

const PREVIEW_SIZE = 5;

/**
 * Passo 11.4 — a seção que o passo 7.6 deixou vazia de propósito (não
 * existia GET /links ainda, ver decisão do 7.1). Só aparece com sessão:
 * GET /links exige login desde o 11.3, e pra visitante anônimo não há
 * "últimos links" nenhum pra mostrar — nada de esconder atrás de um
 * placeholder inventado.
 */
interface UltimosLinksProps {
  /** Incrementado pela Home depois de um POST /links bem-sucedido, pra
   * este efeito rodar de novo sem esperar um F5 (ver Hero.tsx). */
  refreshKey?: number;
}

export default function UltimosLinks({ refreshKey }: UltimosLinksProps) {
  const { usuario } = useAuth();
  const [links, setLinks] = useState<LinkDetalhe[] | null>(null);

  useEffect(() => {
    if (!usuario) {
      setLinks(null);
      return;
    }
    let cancelled = false;
    getMeusLinks(1, PREVIEW_SIZE)
      .then((data) => {
        if (!cancelled) setLinks(data.links);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [usuario, refreshKey]);

  if (!usuario || links === null) return null;

  return (
    <div className="ultimos-links">
      <div className="section-header">
        <h2>Últimos links</h2>
        <Link to="/meus-links">Ver histórico completo →</Link>
      </div>
      <div className="panel">
        <LinkHistoryList links={links} vazioLabel="Você ainda não criou nenhum link." />
      </div>
    </div>
  );
}
