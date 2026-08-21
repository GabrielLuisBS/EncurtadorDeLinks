import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  authService,
  EmailInUseError,
  InvalidCredentialsError,
  InvalidRegistrationError,
} from "../services/auth.service.js";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, sessionService } from "../services/session.service.js";

interface RegistrarBody {
  nome?: string;
  email?: string;
  senha?: string;
}

interface LoginBody {
  email?: string;
  senha?: string;
}

async function startSession(reply: FastifyReply, usuarioId: string): Promise<void> {
  const token = await sessionService.create(usuarioId);
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

export async function authRoutes(app: FastifyInstance) {
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
      await startSession(reply, usuario.id);
      return reply.status(201).send({ id: usuario.id, nome: usuario.nome, email: usuario.email });
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
      await startSession(reply, usuario.id);
      return reply.send({ id: usuario.id, nome: usuario.nome, email: usuario.email });
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
}
