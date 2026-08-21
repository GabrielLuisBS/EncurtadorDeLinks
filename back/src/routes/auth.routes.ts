import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  authService,
  EmailInUseError,
  InvalidCredentialsError,
  InvalidRegistrationError,
  InvalidVerificationTokenError,
} from "../services/auth.service.js";
import { attachUsuario, exigirUsuario } from "../services/auth-context.service.js";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, sessionService } from "../services/session.service.js";
import { usuarioRepository } from "../repositories/usuario.repository.js";
import type { Usuario } from "../generated/prisma/client.js";

interface RegistrarBody {
  nome?: string;
  email?: string;
  senha?: string;
}

interface LoginBody {
  email?: string;
  senha?: string;
}

interface VerificarEmailBody {
  token?: string;
}

async function startSession(reply: FastifyReply, usuario: Usuario): Promise<void> {
  const token = await sessionService.create({
    usuarioId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  });
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // Secure exige HTTPS — em dev local (http://localhost) o cookie
    // simplesmente não seria enviado de volta se isto fosse true sempre.
    secure: process.env.NODE_ENV === "production",
    signed: true,
    maxAge: SESSION_TTL_SECONDS,
  });
}

function serializeUsuario(usuario: Usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    emailVerificado: usuario.emailVerificadoEm !== null,
  };
}

export async function authRoutes(app: FastifyInstance) {
  // Opcional em todo o plugin — /auth/me, /auth/logout e
  // /auth/reenviar-verificacao precisam saber quem está pedindo;
  // registrar/login não precisam, mas rodar sempre é mais simples que
  // decidir rota a rota, e o custo é um GET no Redis.
  app.addHook("onRequest", attachUsuario);

  // Escopado a este plugin — teto bem mais apertado que o rate limit
  // geral (20/min em links.routes.ts). Login e registro são alvo de
  // força bruta e enumeração de e-mail; tráfego legítimo por IP nessas
  // duas rotas é naturalmente baixo.
  await app.register(rateLimit, {
    max: 5,
    timeWindow: "1 minute",
  });

  app.post<{ Body: RegistrarBody }>("/auth/registrar", async (request, reply) => {
    const { nome, email, senha } = request.body ?? {};

    try {
      const usuario = await authService.register(nome, email, senha);
      await startSession(reply, usuario);
      // Dispara e não bloqueia a resposta: sendVerificationEmail já
      // engole falhas de envio internamente (ver email.service.ts) — a
      // conta precisa existir e responder 201 mesmo se o Resend estiver
      // fora do ar.
      await authService.enviarVerificacao(usuario);
      return reply.status(201).send(serializeUsuario(usuario));
    } catch (error) {
      if (error instanceof InvalidRegistrationError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof EmailInUseError) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Body: LoginBody }>("/auth/login", async (request, reply) => {
    const { email, senha } = request.body ?? {};

    try {
      const usuario = await authService.authenticate(email, senha);
      await startSession(reply, usuario);
      return reply.send(serializeUsuario(usuario));
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        // Mesmo status e corpo tanto para "e-mail não existe" quanto para
        // "senha errada" — nunca diferenciar (o tempo de resposta dos
        // dois casos também é igualado, ver authService.authenticate).
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  });

  // Passo 11.4 — o front (navbar, "Meus links") precisa descobrir se já
  // existe sessão ao carregar a página, sem depender de guardar
  // id/nome/email em localStorage (a sessão inteira vive só no cookie
  // httpOnly). Teto de rate limit próprio, bem mais generoso que
  // login/registro: isto roda a cada carregamento de página, não é alvo
  // de força bruta.
  //
  // Vai ao Postgres (não usa só o que já está cacheado na sessão) porque
  // emailVerificadoEm muda *durante* a vida da sessão (a pessoa confirma
  // o e-mail depois de já estar logada) — nome/email não mudam nunca
  // (sem edição de perfil no produto), mas esse campo muda, então cachear
  // ele na sessão mostraria "não verificado" pra sempre até expirar/logar
  // de novo.
  app.get(
    "/auth/me",
    { preHandler: exigirUsuario, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const usuario = await usuarioRepository.findById(request.usuarioId as string);
      if (!usuario) {
        // Conta apagada com a sessão ainda válida no Redis (TTL de 30
        // dias sobrevive à conta) — trata como deslogado, não como erro.
        return reply.status(401).send({ error: "Sessão inválida ou expirada." });
      }
      return reply.send(serializeUsuario(usuario));
    },
  );

  app.post(
    "/auth/logout",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const raw = request.cookies[SESSION_COOKIE_NAME];
      if (raw) {
        const unsigned = request.unsignCookie(raw);
        if (unsigned.valid && unsigned.value) {
          await sessionService.destroy(unsigned.value);
        }
      }
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return reply.status(204).send();
    },
  );

  // Chamado pela página /verificar-email do front com o token da query
  // string do link mandado por e-mail. Não exige sessão — quem clica no
  // link pode não estar logado neste navegador (ex.: abriu num app de
  // e-mail separado).
  app.post<{ Body: VerificarEmailBody }>(
    "/auth/verificar-email",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      try {
        const usuario = await authService.verificarEmail(request.body?.token);
        return reply.send(serializeUsuario(usuario));
      } catch (error) {
        if (error instanceof InvalidVerificationTokenError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  // Exige sessão — reenviar é uma ação de quem já está logado e quer
  // confirmar o próprio e-mail, não algo que se faz por outra pessoa.
  // Rate limit mais apertado que /auth/me: dispara envio de e-mail de
  // verdade (custa e pode ser abusado pra spam), o teto padrão do
  // plugin (5/min) já cobre isso.
  app.post(
    "/auth/reenviar-verificacao",
    { preHandler: exigirUsuario },
    async (request, reply) => {
      const usuario = await usuarioRepository.findById(request.usuarioId as string);
      if (!usuario) {
        return reply.status(401).send({ error: "Sessão inválida ou expirada." });
      }
      if (usuario.emailVerificadoEm) {
        return reply.status(400).send({ error: "Este e-mail já foi confirmado." });
      }
      await authService.enviarVerificacao(usuario);
      return reply.status(204).send();
    },
  );
}
