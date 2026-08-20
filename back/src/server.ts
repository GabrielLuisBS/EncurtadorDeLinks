import "dotenv/config";
import Fastify from "fastify";
import { linksRoutes } from "./routes/links.routes.js";
import { redirectRoutes } from "./routes/redirect.routes.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3333);

app.register(linksRoutes);
app.register(redirectRoutes);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
