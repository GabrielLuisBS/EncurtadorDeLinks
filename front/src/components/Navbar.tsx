import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, reenviarVerificacao } from '../lib/api';
import { ChevronDownIcon, InfoIcon, LinkIcon, LogOutIcon } from './icons';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link active' : 'nav-link';
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function Navbar() {
  const { usuario, carregando, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const [reenvioErro, setReenvioErro] = useState<string | null>(null);

  async function handleReenviar() {
    if (reenviando) return;
    setReenviando(true);
    setReenvioErro(null);
    try {
      await reenviarVerificacao();
      setReenviado(true);
    } catch (err) {
      setReenvioErro(err instanceof ApiError ? err.message : 'Não foi possível reenviar.');
    } finally {
      setReenviando(false);
    }
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <>
    <div className="navbar">
      <NavLink className="logo" to="/">
        <div className="logo-mark">
          <LinkIcon size={18} strokeWidth={2} />
        </div>
        <div className="logo-text">Linkly</div>
      </NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={navLinkClass}>
          Início
        </NavLink>
        <NavLink to="/estatisticas" className={navLinkClass}>
          Estatísticas
        </NavLink>
        {/* Só entra quando há sessão — sem conta não existe "meus links"
            pra listar (ver decisão do passo 11.3: GET /links exige login). */}
        {usuario && (
          <NavLink to="/meus-links" className={navLinkClass}>
            Meus links
          </NavLink>
        )}
        {/* "Sobre" não tem página no roteiro — sem href de propósito. */}
        <a className="nav-link">Sobre</a>
      </div>

      {carregando ? (
        // Placeholder do mesmo tamanho do botão "Entrar" — sem isto a
        // navbar "pula" de largura assim que o GET /auth/me inicial
        // resolve, porque o layout muda de botão pra menu de conta.
        <div className="navbar-side-placeholder" />
      ) : usuario ? (
        <div className="account-menu" ref={menuRef}>
          <button type="button" className="account-trigger" onClick={() => setMenuOpen((v) => !v)}>
            <span className="account-avatar">{initials(usuario.nome)}</span>
            <span className="account-name">{usuario.nome}</span>
            <ChevronDownIcon />
          </button>
          {menuOpen && (
            <div className="account-dropdown">
              <NavLink
                to="/meus-links"
                className="account-dropdown-item"
                onClick={() => setMenuOpen(false)}
              >
                Meus links
              </NavLink>
              <button type="button" className="account-dropdown-item" onClick={handleLogout}>
                <LogOutIcon size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      ) : (
        <NavLink to="/entrar" className="btn-ghost">
          Entrar
        </NavLink>
      )}
    </div>

    {/* Verificação de e-mail (passo 11.4) não bloqueia nada no produto
        — é só um lembrete. Some sozinho quando emailVerificado vira
        true (AuthContext.refresh, chamado por VerificarEmail.tsx). */}
    {usuario && !usuario.emailVerificado && (
      <div className="verify-banner">
        <InfoIcon size={15} />
        <span>Confirme seu e-mail pra garantir o acesso à sua conta.</span>
        {reenviado ? (
          <span className="verify-banner-status">E-mail reenviado — confira sua caixa de entrada.</span>
        ) : (
          <button type="button" onClick={handleReenviar} disabled={reenviando}>
            {reenviando ? 'Enviando...' : 'Reenviar e-mail'}
          </button>
        )}
        {reenvioErro && <span className="verify-banner-status">{reenvioErro}</span>}
      </div>
    )}
    </>
  );
}
