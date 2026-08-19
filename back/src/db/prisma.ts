import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Client Prisma compartilhado. Único ponto de conexão com o Postgres —
 * só o Repository deve importar isto (ver nota "Camadas e Serviços").
 * Adapter TCP padrão (@prisma/adapter-pg): o back roda como processo
 * Node persistente no Render, não precisa do adapter HTTP do Neon.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
