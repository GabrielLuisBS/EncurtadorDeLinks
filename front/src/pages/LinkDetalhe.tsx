import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import MiniClicksChart from '../components/MiniClicksChart';
import Navbar from '../components/Navbar';
import {
  ApiError,
  getLink,
  getLinkStats,
  qrCodeUrl,
  updateLink,
  type LinkDetalhe as LinkDetalheData,
  type LinkStatsSummary,
} from '../lib/api';
import {
  computeLinkStatus,
  formatDateTime,
  formatDayMonthYear,
  formatRelative,
  stripProtocol,
  type LinkStatus,
} from '../lib/format';
import {
  ChevronLeftIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LinkIcon,
  QrIcon,
  SettingsIcon,
  TrendingUpIcon,
} from '../components/icons';

const numberFormatter = new Intl.NumberFormat('pt-BR');

function statusLabel(status: LinkStatus): string {
  if (status === 'ativo') return 'Ativo';
  if (status === 'desativado') return 'Desativado';
  return 'Expirado';
}

// Data mínima aceitável no seletor — o back recusa expiraEm no passado
// (ver "Alterar", InvalidExpirationError); isso só evita a viagem
// desnecessária até o servidor pra descobrir a mesma coisa.
function tomorrowDateOnly(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function LinkDetalhePage() {
  const { slug = '' } = useParams<{ slug: string }>();

  const [link, setLink] = useState<LinkDetalheData | null>(null);
  const [stats, setStats] = useState<LinkStatsSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingAtivo, setSavingAtivo] = useState(false);
  const [editingExpiracao, setEditingExpiracao] = useState(false);
  const [expiracaoInput, setExpiracaoInput] = useState('');
  const [expiracaoError, setExpiracaoError] = useState<string | null>(null);
  const [savingExpiracao, setSavingExpiracao] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLink(null);
    setNotFound(false);

    getLink(slug)
      .then((data) => {
        if (!cancelled) setLink(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    // Resumo dos tiles falha em silêncio — o resto da tela (cabeçalho, QR,
    // configurações) não depende dele.
    getLinkStats(slug, 7)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleToggleAtivo() {
    if (!link || savingAtivo) return;
    setSavingAtivo(true);
    try {
      const updated = await updateLink(slug, { ativo: !link.ativo });
      setLink({ ...link, ativo: updated.ativo });
    } catch {
      // Falha ao alternar: o switch simplesmente não muda de estado.
    } finally {
      setSavingAtivo(false);
    }
  }

  function openExpiracaoEditor() {
    setExpiracaoInput(link?.expiraEm ? link.expiraEm.slice(0, 10) : '');
    setExpiracaoError(null);
    setEditingExpiracao(true);
  }

  async function handleSaveExpiracao(event: FormEvent) {
    event.preventDefault();
    if (!link || !expiracaoInput || savingExpiracao) return;
    setSavingExpiracao(true);
    setExpiracaoError(null);
    try {
      const updated = await updateLink(slug, { expiraEm: expiracaoInput });
      setLink({ ...link, expiraEm: updated.expiraEm });
      setEditingExpiracao(false);
    } catch (err) {
      setExpiracaoError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSavingExpiracao(false);
    }
  }

  async function handleRemoveExpiracao() {
    if (!link || savingExpiracao) return;
    setSavingExpiracao(true);
    setExpiracaoError(null);
    try {
      const updated = await updateLink(slug, { expiraEm: null });
      setLink({ ...link, expiraEm: updated.expiraEm });
      setEditingExpiracao(false);
    } catch (err) {
      setExpiracaoError(err instanceof ApiError ? err.message : 'Não foi possível remover.');
    } finally {
      setSavingExpiracao(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.urlCurta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard indisponível — falha silenciosa.
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <Navbar />
        <div className="content">
          <div className="panel-empty">Link não encontrado.</div>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="page">
        <Navbar />
      </div>
    );
  }

  const status = computeLinkStatus(link.ativo, link.expiraEm);

  return (
    <div className="page">
      <Navbar />
      <div className="content">
        <Link className="back" to="/">
          <ChevronLeftIcon />
          Início
        </Link>

        <div className="detail-head">
          <div className="head-left">
            <div className="short-line">
              <div className="short-badge">
                <LinkIcon size={20} />
              </div>
              <div className="url-short">{stripProtocol(link.urlCurta)}</div>
              <div className={status === 'ativo' ? 'status-badge' : 'status-badge neutral'}>
                <div className="status-dot" />
                <div className="status-text">{statusLabel(status)}</div>
              </div>
            </div>
            <div className="origin-line">
              <ExternalLinkIcon size={15} />
              <div className="url-original">{link.urlDestino}</div>
            </div>
          </div>
          <div className="head-actions">
            <button type="button" className="btn-copy" onClick={handleCopy}>
              <CopyIcon />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <a className="btn-outline" href={link.urlCurta} target="_blank" rel="noreferrer">
              <ExternalLinkIcon size={15} />
              Abrir
            </a>
          </div>
        </div>

        <div className="grid">
          <div className="col">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-ico">
                  <SettingsIcon />
                </div>
                <div className="panel-title">Configurações do link</div>
              </div>

              {/* Passo 11.3: PATCH agora exige ser dono do link (link sem
                  dono é imutável pra sempre, ver link.service.ts no back).
                  `link.dono` (novo no passo 11.4) diz se a sessão atual
                  pode editar — sem isso o switch pareceria funcionar e
                  falharia com 403 no clique, silenciosamente. */}
              {!link.dono && (
                <div className="setting-readonly-notice">
                  Você não é dono deste link — as configurações abaixo são somente leitura.
                </div>
              )}

              <div className="setting">
                <div className="setting-text">
                  <div className="setting-name">Link ativo</div>
                  <div className="setting-desc">
                    Desativar faz o link parar de redirecionar na hora, mantendo as
                    estatísticas já registradas.
                  </div>
                </div>
                <div className="setting-side">
                  <button
                    type="button"
                    className={link.ativo ? 'switch on' : 'switch'}
                    role="switch"
                    aria-checked={link.ativo}
                    disabled={savingAtivo || !link.dono}
                    onClick={handleToggleAtivo}
                  >
                    <span className="knob" />
                  </button>
                </div>
              </div>

              <div className="setting">
                <div className="setting-text">
                  <div className="setting-name">Data de expiração</div>
                  <div className="setting-desc">
                    {editingExpiracao
                      ? 'Precisa ser uma data no futuro.'
                      : 'Depois dessa data o link para de funcionar sozinho.'}
                  </div>
                  {expiracaoError && <div className="input-error">{expiracaoError}</div>}
                </div>
                {editingExpiracao ? (
                  <form className="expiracao-edit" onSubmit={handleSaveExpiracao}>
                    <input
                      type="date"
                      className="expiracao-input"
                      value={expiracaoInput}
                      min={tomorrowDateOnly()}
                      onChange={(event) => setExpiracaoInput(event.target.value)}
                      required
                    />
                    <button type="submit" className="btn-mini" disabled={savingExpiracao}>
                      Salvar
                    </button>
                    {link.expiraEm && (
                      <button
                        type="button"
                        className="btn-mini"
                        disabled={savingExpiracao}
                        onClick={handleRemoveExpiracao}
                      >
                        Remover
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-mini"
                      onClick={() => setEditingExpiracao(false)}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="setting-side">
                    <div className="setting-value">
                      {link.expiraEm ? formatDayMonthYear(link.expiraEm) : 'Sem expiração'}
                    </div>
                    {link.dono && (
                      <button type="button" className="btn-mini" onClick={openExpiracaoEditor}>
                        Alterar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="setting">
                <div className="setting-text">
                  <div className="setting-name">Criado em</div>
                  <div className="setting-desc">{formatDateTime(link.criadoEm)}</div>
                </div>
                <div className="setting-side">
                  <div className="setting-value">{formatRelative(link.criadoEm)}</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-ico">
                  <TrendingUpIcon />
                </div>
                <div className="panel-title">Cliques nos últimos 7 dias</div>
              </div>
              <div className="chart-head">
                <Link to="/estatisticas">Ver estatísticas completas →</Link>
              </div>
              <MiniClicksChart slug={slug} />
            </div>
          </div>

          <div className="col">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-ico">
                  <QrIcon />
                </div>
                <div className="panel-title">QR Code</div>
              </div>
              <div className="qr-body">
                <div className="qr-frame">
                  <img src={qrCodeUrl(slug)} alt={`QR Code de ${link.urlCurta}`} width={164} height={164} />
                </div>
                <div className="qr-caption">
                  Gerado a partir da URL curta, sempre atualizado — nada é armazenado.
                </div>
                <a
                  className="btn-download"
                  href={qrCodeUrl(slug)}
                  download={`linkly-${slug}.png`}
                >
                  <DownloadIcon />
                  Baixar PNG
                </a>
              </div>
            </div>

            <div className="tiles">
              <div className="tile">
                <div className="tile-num">
                  {stats ? numberFormatter.format(stats.totalCliques) : '—'}
                </div>
                <div className="tile-lbl">Cliques no total</div>
              </div>
              <div className="tile">
                <div className="tile-num">
                  {stats ? numberFormatter.format(stats.cliquesNoPeriodo) : '—'}
                </div>
                <div className="tile-lbl">Últimos 7 dias</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
