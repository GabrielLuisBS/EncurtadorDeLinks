import argon2 from "argon2";
import type { Usuario } from "../generated/prisma/client.js";
import { usuarioRepository } from "../repositories/usuario.repository.js";

const MIN_SENHA_LENGTH = 8;
// Mesmo teto de back/prisma/schema.prisma (Usuario.nome VarChar(120)) —
// validado aqui também pra devolver 400 com mensagem clara em vez de
// deixar o Postgres recusar com um erro de coluna.
const MAX_NOME_LENGTH = 120;
// Formato, não deliverability — mesma filosofia de "recusar o obviamente
// errado" da nota Segurança, não tentar confirmar que o e-mail existe.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidRegistrationError extends Error {}
export class EmailInUseError extends Error {}
export class InvalidCredentialsError extends Error {}

function validateNome(nome: unknown): string {
  if (typeof nome !== "string" || nome.trim().length === 0) {
    throw new InvalidRegistrationError("Nome é obrigatório.");
  }
  const trimmed = nome.trim();
  if (trimmed.length > MAX_NOME_LENGTH) {
    throw new InvalidRegistrationError(`Nome precisa ter no máximo ${MAX_NOME_LENGTH} caracteres.`);
  }
  return trimmed;
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    throw new InvalidRegistrationError("E-mail inválido.");
  }
  return email.trim().toLowerCase();
}

function validateSenha(senha: unknown): string {
  if (typeof senha !== "string" || senha.length < MIN_SENHA_LENGTH) {
    throw new InvalidRegistrationError(`Senha precisa ter pelo menos ${MIN_SENHA_LENGTH} caracteres.`);
  }
  return senha;
}

/**
 * Hash de uma senha fixa que nunca vai bater com nada real, computado
 * uma vez e reaproveitado sempre que o e-mail não existe. Sem isto,
 * login com e-mail inexistente pula o argon2.verify inteiro e responde
 * bem mais rápido que "senha errada" — a diferença de tempo vazaria a
 * mesma informação que a mensagem de erro já esconde de propósito.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash("senha-fixa-nunca-usada-so-para-igualar-o-tempo-de-resposta");
  return dummyHashPromise;
}

export const authService = {
  async register(nomeInput: unknown, emailInput: unknown, senhaInput: unknown): Promise<Usuario> {
    const nome = validateNome(nomeInput);
    const email = normalizeEmail(emailInput);
    const senha = validateSenha(senhaInput);

    const existente = await usuarioRepository.findByEmail(email);
    if (existente) {
      throw new EmailInUseError("E-mail já cadastrado.");
    }

    const senhaHash = await argon2.hash(senha);
    return usuarioRepository.create({ nome, email, senhaHash });
  },

  /**
   * "E-mail não existe" e "senha errada" precisam ser indistinguíveis
   * pra quem chama — mesma mensagem, mesmo status, e (ver getDummyHash)
   * o mesmo tempo de resposta. argon2.verify roda sempre, exista o
   * usuário ou não.
   */
  async authenticate(emailInput: unknown, senhaInput: unknown): Promise<Usuario> {
    if (typeof emailInput !== "string" || typeof senhaInput !== "string") {
      throw new InvalidCredentialsError("E-mail ou senha inválidos.");
    }
    const email = emailInput.trim().toLowerCase();

    const usuario = await usuarioRepository.findByEmail(email);
    const hashParaVerificar = usuario?.senhaHash ?? (await getDummyHash());
    const senhaValida = await argon2.verify(hashParaVerificar, senhaInput);

    if (!usuario || !senhaValida) {
      throw new InvalidCredentialsError("E-mail ou senha inválidos.");
    }

    return usuario;
  },
};
