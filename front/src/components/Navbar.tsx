import { LinkIcon } from './icons';

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">
        <div className="logo-mark">
          <LinkIcon size={18} strokeWidth={2} />
        </div>
        <div className="logo-text">Linkly</div>
      </div>
      {/* Sem href ainda: Estatísticas (fase 8) e Sobre não têm página, e
          nenhum roteador foi introduzido neste passo — só a navbar visual. */}
      <div className="nav-links">
        <a className="nav-link active">Início</a>
        <a className="nav-link">Estatísticas</a>
        <a className="nav-link">Sobre</a>
      </div>
      <button type="button" className="btn-ghost">
        Entrar
      </button>
    </div>
  );
}
