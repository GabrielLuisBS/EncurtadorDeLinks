function LinkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 15L15 9" />
      <path d="M10.5 6.5L12 5a4 4 0 015.66 5.66l-1.5 1.5" />
      <path d="M13.5 17.5L12 19a4 4 0 01-5.66-5.66l1.5-1.5" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">
        <div className="logo-mark">
          <LinkIcon />
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
