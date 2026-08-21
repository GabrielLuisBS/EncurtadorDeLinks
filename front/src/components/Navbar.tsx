import { NavLink } from 'react-router-dom';
import { LinkIcon } from './icons';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link active' : 'nav-link';
}

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">
        <div className="logo-mark">
          <LinkIcon size={18} strokeWidth={2} />
        </div>
        <div className="logo-text">Linkly</div>
      </div>
      <div className="nav-links">
        <NavLink to="/" end className={navLinkClass}>
          Início
        </NavLink>
        <NavLink to="/estatisticas" className={navLinkClass}>
          Estatísticas
        </NavLink>
        {/* "Sobre" não tem página no roteiro — sem href de propósito. */}
        <a className="nav-link">Sobre</a>
      </div>
      <button type="button" className="btn-ghost">
        Entrar
      </button>
    </div>
  );
}
