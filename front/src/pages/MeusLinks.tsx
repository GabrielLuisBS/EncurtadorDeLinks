import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LinkHistoryList from '../components/LinkHistoryList';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { getMeusLinks, type LinkDetalhe } from '../lib/api';

export default function MeusLinks() {
  const { usuario, carregando: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [links, setLinks] = useState<LinkDetalhe[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let cancelled = false;
    setLinks(null);
    getMeusLinks(page)
      .then((data) => {
        if (!cancelled) {
          setLinks(data.links);
          setPageSize(data.pageSize);
        }
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [usuario, page]);

  // GET /links exige sessão desde o passo 11.3 — quem chega aqui sem
  // login (link direto, sessão expirada) vê um convite pra entrar, não
  // uma lista vazia enganosa.
  if (!authLoading && !usuario) {
    return (
      <div className="page">
        <Navbar />
        <div className="content">
          <div className="panel-empty">
            Você precisa <Link to="/entrar">entrar</Link> para ver seus links.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <div className="content">
        <div className="page-header">
          <div>
            <h1>Meus links</h1>
            <div className="subtitle">Todos os links criados com a sua conta.</div>
          </div>
        </div>

        <div className="panel">
          {links === null ? (
            <div className="panel-empty">Carregando...</div>
          ) : (
            <LinkHistoryList links={links} />
          )}
        </div>

        {links !== null && (page > 1 || links.length === pageSize) && (
          <div className="pagination">
            <button
              type="button"
              className="btn-mini"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <span className="pagination-page">Página {page}</span>
            <button
              type="button"
              className="btn-mini"
              disabled={links.length < pageSize}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
