import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, verificarEmail } from '../lib/api';
import { LinkIcon } from '../components/icons';

type Estado = 'verificando' | 'sucesso' | 'erro';

export default function VerificarEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refresh } = useAuth();

  const [estado, setEstado] = useState<Estado>('verificando');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setEstado('erro');
      setErro('Link de verificação inválido — falta o token.');
      return;
    }

    let cancelled = false;
    verificarEmail(token)
      .then(async () => {
        // Se a pessoa está logada neste navegador (caso comum: abriu o
        // e-mail na mesma sessão), atualiza o usuario do contexto pra o
        // banner de "confirme seu e-mail" sumir sem precisar de F5.
        await refresh();
        if (!cancelled) setEstado('sucesso');
      })
      .catch((err) => {
        if (cancelled) return;
        setErro(err instanceof ApiError ? err.message : 'Não foi possível confirmar o e-mail.');
        setEstado('erro');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="page">
      <div className="auth-navbar">
        <Link className="logo" to="/">
          <div className="logo-mark">
            <LinkIcon size={18} strokeWidth={2} />
          </div>
          <div className="logo-text">Linkly</div>
        </Link>
      </div>

      <div className="auth-shell">
        <div className="auth-card auth-card-center">
          {estado === 'verificando' && (
            <>
              <h1>Confirmando seu e-mail...</h1>
              <div className="subtitle">Só um instante.</div>
            </>
          )}

          {estado === 'sucesso' && (
            <>
              <h1>E-mail confirmado!</h1>
              <div className="subtitle">Sua conta está verificada. Pode voltar pro Linkly.</div>
              <Link className="btn-accent auth-submit" to="/">
                Ir pro início
              </Link>
            </>
          )}

          {estado === 'erro' && (
            <>
              <h1>Não deu certo</h1>
              <div className="subtitle">{erro}</div>
              <div className="subtitle">
                Se o link expirou, entre na sua conta — um aviso no topo da tela deixa reenviar a
                confirmação.
              </div>
              <Link className="btn-outline auth-submit" to="/entrar">
                Ir pra tela de entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
