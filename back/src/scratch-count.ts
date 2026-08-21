import "dotenv/config";
import { prisma } from "./db/prisma.js";

const n = await prisma.clique.count();
console.log(n);
await prisma.$disconnect();
process.exit(0);
