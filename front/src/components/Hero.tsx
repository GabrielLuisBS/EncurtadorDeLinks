import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, createLink, type CreateLinkResult } from '../lib/api';
import { stripProtocol } from '../lib/format';
import { CopyIcon, ExternalLinkIcon, LinkIcon } from './icons';

interface HeroProps {
  /** Chamado depois de um POST /links bem-sucedido — a Home usa isso pra
   * atualizar "Últimos links" (passo 11.4) sem esperar um F5. */
  onCreated?: () => void;
}

export default function Hero({ onCreated }: HeroProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
    setResult(null);
    setError(null);
    setCopied(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      setResult(await createLink(url.trim()));
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível encurtar o link. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.urlCurta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) — falha
      // silenciosa, a URL curta continua visível pra copiar manualmente.
    }
  }

  return (
    <div className="hero">
      <h1>
        Encurte. Compartilhe.
        <br />
        Acompanhe.
      </h1>
      <div className="subtitle">
        Transforme links longos em URLs curtas e fáceis de compartilhar.
      </div>

      <form className="input-bar" onSubmit={handleSubmit}>
        <LinkIcon className="link-ico" />
        <input
          className="link-input"
          type="text"
          inputMode="url"
          value={url}
          onChange={handleChange}
          placeholder="Cole seu link aqui..."
          disabled={loading}
          required
        />
        <button type="submit" className="btn-accent" disabled={loading}>
          {loading ? 'Encurtando...' : 'Encurtar link'}
        </button>
      </form>

      {error && <div className="input-error">{error}</div>}

      {result && (
        <div className="result-card">
          <div className="result-row original">
            <ExternalLinkIcon />
            <div className="url-original">{url}</div>
          </div>
          <div className="result-row short">
            <div className="short-left">
              <div className="short-badge">
                <LinkIcon size={16} />
              </div>
              <div className="url-short">{stripProtocol(result.urlCurta)}</div>
            </div>
            <div className="result-actions">
              <button type="button" className="btn-copy" onClick={handleCopy}>
                <CopyIcon />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <a className="btn-icon-sm" href={result.urlCurta} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
