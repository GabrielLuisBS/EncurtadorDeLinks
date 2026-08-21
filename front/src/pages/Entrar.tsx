import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../lib/api';
import { InfoIcon, LinkIcon, LockIcon, MailIcon, UserIcon } from '../components/icons';

interface EntrarProps {
  modo: 'entrar' | 'criar-conta';
}

export default function Entrar({ modo }: EntrarProps) {
  const isCriarConta = modo === 'criar-conta';
  const { login, registrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (isCriarConta && senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (isCriarConta) {
        await registrar(nome, email, senha);
      } else {
        await login(email, senha);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível completar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-navbar">
        <Link className="logo" to="/">
          <div className="logo-mark">
            <LinkIcon size={18} strokeWidth={2} />
          </div>
          <div className="logo-text">Linkly</div>
        </Link>
        {isCriarConta ? (
          <div className="auth-navbar-side">
            <span className="auth-navbar-prompt">Já tem conta?</span>
            <Link className="btn-ghost" to="/entrar">
              Entrar
            </Link>
          </div>
        ) : (
          <div className="auth-navbar-side">
            <span className="auth-navbar-prompt">Ainda não tem conta?</span>
            <Link className="btn-ghost" to="/criar-conta">
              Criar conta
            </Link>
          </div>
        )}
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h1>{isCriarConta ? 'Criar conta no Linkly' : 'Entrar no Linkly'}</h1>
          <div className="subtitle">
            {isCriarConta
              ? 'Crie uma conta para guardar seu histórico de links e abrir o painel de estatísticas.'
              : 'Acesse seu histórico de links e o painel de estatísticas.'}
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isCriarConta && (
              <div className="field">
                <label htmlFor="nome">Nome</label>
                <div className="field-input">
                  <UserIcon className="field-ico" />
                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">E-mail</label>
              <div className="field-input">
                <MailIcon className="field-ico" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="senha">Senha</label>
                {/* Sem endpoint de recuperação de senha no back — inerte de
                    propósito, mesmo tratamento que "Sobre" na navbar
                    (Navbar.tsx): visualmente presente, sem prometer uma
                    ação que não existe. */}
                {!isCriarConta && <span className="field-link-inert">Esqueci minha senha</span>}
              </div>
              <div className="field-input">
                <LockIcon className="field-ico" />
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  required
                  minLength={isCriarConta ? 8 : undefined}
                  disabled={loading}
                />
              </div>
            </div>

            {isCriarConta && (
              <div className="field">
                <label htmlFor="confirmarSenha">Confirmar senha</label>
                <div className="field-input">
                  <LockIcon className="field-ico" />
                  <input
                    id="confirmarSenha"
                    type="password"
                    value={confirmarSenha}
                    onChange={(event) => setConfirmarSenha(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && <div className="input-error">{error}</div>}

            <button type="submit" className="btn-accent auth-submit" disabled={loading}>
              {loading ? 'Um momento...' : isCriarConta ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="auth-footer">
            {isCriarConta ? (
              <>
                Já tem conta? <Link to="/entrar">Entrar</Link>
              </>
            ) : (
              <>
                Primeira vez por aqui? <Link to="/criar-conta">Criar uma conta</Link>
              </>
            )}
          </div>
        </div>

        <div className="auth-reinforce">
          <InfoIcon />
          <p>
            Encurtar link não exige conta. Ela existe para guardar seu histórico, abrir o painel
            de estatísticas e deixar você desativar um link depois.
          </p>
        </div>
      </div>
    </div>
  );
}
