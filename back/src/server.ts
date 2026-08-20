import "dotenv/config";
import Fastify, { type FastifyError } from "fastify";
import { linksRoutes } from "./routes/links.routes.js";
import { redirectRoutes } from "./routes/redirect.routes.js";
import { statsRoutes } from "./routes/stats.routes.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3333);

// Sem isto, um erro não tratado (ex.: Prisma, Redis) cai no handler padrão
// do Fastify, que devolve error.message ao cliente — podendo vazar detalhe
// interno (nome de coluna, host de conexão, etc.). Erros com statusCode
// < 500 já são nossos ou de plugins (rate-limit, parser de body) com
// mensagem pensada pra ser lida pelo cliente, então passam direto. Ver
// nota "Segurança": "Erros tratados — vazamento de stack trace / detalhes
// internos ao cliente".
app.setErrorHandler((error: FastifyError, request, reply) => {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    request.log.error({ err: error }, "erro não tratado");
    return reply.status(500).send({ error: "Erro interno do servidor." });
  }

  return reply.status(statusCode).send({ error: error.message });
});

app.register(linksRoutes);
app.register(statsRoutes);
app.register(redirectRoutes);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
