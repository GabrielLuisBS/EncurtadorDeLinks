import { Redis } from "ioredis";

/**
 * Client Redis compartilhado (Upstash). Só o CacheService deve falar
 * com isto diretamente — mesma regra do client Prisma em db/prisma.ts.
 */
export const redis = new Redis(process.env.REDIS_URL as string);
