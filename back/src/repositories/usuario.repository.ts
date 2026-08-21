import type { Usuario } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

interface CreateUsuarioInput {
  nome: string;
  email: string;
  senhaHash: string;
}

export const usuarioRepository = {
  create(data: CreateUsuarioInput): Promise<Usuario> {
    return prisma.usuario.create({ data });
  },

  findByEmail(email: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({ where: { email } });
  },
};
