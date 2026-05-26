/**
 * Server-side user store backed by PostgreSQL via Prisma.
 * Drop-in replacement for the previous JSON-file implementation.
 * NEVER import this module in client components.
 */

import { prisma } from "@/lib/prisma";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import type { PerfilUsuario } from "@prisma/client";

export interface UserAuth {
  id: string;
  organizacaoId: string;
  nome: string;
  email: string;
  passwordHash?: string;
  perfil: "administrador" | "formador_geral" | "formador_comunitario";
  moradaId?: string;
  ativo: boolean;
  criadoEm: string;
  primeiroAcesso?: boolean;
}

export type UserPublic = Omit<UserAuth, "passwordHash">;

// ----------------------------------------------------------------
// Helpers de senha (mantidos idênticos à implementação anterior)
// ----------------------------------------------------------------

export function generateRandomPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "@#$!%*?&";
  const all = lower + upper + digits + special;

  const pick = (charset: string): string => {
    const maxValid = Math.floor(256 / charset.length) * charset.length;
    let byte: number;
    do { byte = randomBytes(1)[0]; } while (byte >= maxValid);
    return charset[byte % charset.length];
  };

  const required = [pick(lower), pick(upper), pick(digits), pick(special)];
  const rest = Array.from({ length: 8 }, () => pick(all));

  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const maxValid = Math.floor(256 / (i + 1)) * (i + 1);
    let byte: number;
    do { byte = randomBytes(1)[0]; } while (byte >= maxValid);
    const j = byte % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const key = scryptSync(password, salt, 64);
    return timingSafeEqual(key, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------
// Conversão Prisma → UserAuth
// ----------------------------------------------------------------

function toUserAuth(u: {
  id: string;
  organizacaoId: string;
  nome: string;
  email: string;
  passwordHash: string | null;
  perfil: PerfilUsuario;
  moradaId: string | null;
  ativo: boolean;
  criadoEm: Date;
  primeiroAcesso: boolean;
}): UserAuth {
  return {
    id: u.id,
    organizacaoId: u.organizacaoId,
    nome: u.nome,
    email: u.email,
    passwordHash: u.passwordHash ?? undefined,
    perfil: u.perfil as UserAuth["perfil"],
    moradaId: u.moradaId ?? undefined,
    ativo: u.ativo,
    criadoEm: u.criadoEm.toISOString().split("T")[0],
    primeiroAcesso: u.primeiroAcesso,
  };
}

// ----------------------------------------------------------------
// Leitura
// ----------------------------------------------------------------

export async function listUsers(
  organizacaoId: string,
  options?: { skip?: number; take?: number }
): Promise<UserAuth[]> {
  const users = await prisma.usuario.findMany({
    where: { organizacaoId, deletedAt: null },
    ...options,
  });
  return users.map(toUserAuth);
}

export async function countUsers(organizacaoId: string): Promise<number> {
  return prisma.usuario.count({ where: { organizacaoId, deletedAt: null } });
}

export async function findByEmail(
  email: string,
  organizacaoId: string
): Promise<UserAuth | undefined> {
  const user = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, organizacaoId, deletedAt: null },
  });
  return user ? toUserAuth(user) : undefined;
}

// Searches across all orgs — used for multi-tenant login and Google OAuth
export async function findByEmailGlobal(email: string): Promise<UserAuth | undefined> {
  const user = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
  });
  return user ? toUserAuth(user) : undefined;
}

export async function findById(
  id: string,
  organizacaoId?: string
): Promise<UserAuth | undefined> {
  const user = await prisma.usuario.findFirst({
    where: organizacaoId ? { id, organizacaoId, deletedAt: null } : { id, deletedAt: null },
  });
  return user ? toUserAuth(user) : undefined;
}

export async function authenticate(
  email: string,
  password: string,
  organizacaoId: string
): Promise<UserAuth | null> {
  const user = await findByEmail(email, organizacaoId);
  if (!user || !user.ativo || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

// Multi-tenant login: searches by email across all orgs
export async function authenticateGlobal(
  email: string,
  password: string
): Promise<UserAuth | null> {
  const user = await findByEmailGlobal(email);
  if (!user || !user.ativo || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

// ----------------------------------------------------------------
// Escrita
// ----------------------------------------------------------------

export async function createUser(
  data: Omit<UserAuth, "id" | "criadoEm" | "passwordHash" | "organizacaoId"> & {
    password?: string;
    organizacaoId: string;
  }
): Promise<{ user: UserAuth; tempPassword?: string }> {
  const orgId = data.organizacaoId;
  const tempPassword = !data.password ? generateRandomPassword() : undefined;
  const password = data.password ?? tempPassword!;

  const created = await prisma.usuario.create({
    data: {
      organizacaoId: orgId,
      nome: data.nome,
      email: data.email,
      passwordHash: hashPassword(password),
      perfil: data.perfil as PerfilUsuario,
      moradaId: data.moradaId ?? null,
      ativo: data.ativo,
      primeiroAcesso: tempPassword !== undefined ? true : (data.primeiroAcesso ?? false),
    },
  });

  return { user: toUserAuth(created), tempPassword };
}

export async function updateUser(
  id: string,
  data: Partial<Omit<UserAuth, "id" | "criadoEm" | "passwordHash">> & {
    password?: string;
    organizacaoId: string;
  }
): Promise<UserAuth | null> {
  const orgId = data.organizacaoId;
  const exists = await prisma.usuario.findFirst({ where: { id, organizacaoId: orgId } });
  if (!exists) return null;

  const { password, organizacaoId: _organizacaoId, ...rest } = data;

  const updated = await prisma.usuario.update({
    where: { id },
    data: {
      ...(rest.nome !== undefined && { nome: rest.nome }),
      ...(rest.email !== undefined && { email: rest.email }),
      ...(rest.perfil !== undefined && { perfil: rest.perfil as PerfilUsuario }),
      ...(rest.moradaId !== undefined && { moradaId: rest.moradaId ?? null }),
      ...(rest.ativo !== undefined && { ativo: rest.ativo }),
      ...(rest.primeiroAcesso !== undefined && { primeiroAcesso: rest.primeiroAcesso }),
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });
  return toUserAuth(updated);
}

export async function deleteUser(
  id: string,
  organizacaoId: string
): Promise<boolean> {
  const exists = await prisma.usuario.findFirst({ where: { id, organizacaoId } });
  if (!exists) return false;
  await prisma.usuario.delete({ where: { id } });
  return true;
}

export function toPublic(u: UserAuth): UserPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...pub } = u;
  return pub;
}
