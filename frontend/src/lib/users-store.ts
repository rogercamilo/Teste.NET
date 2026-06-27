/**
 * Server-side user store backed by PostgreSQL via Prisma.
 * Drop-in replacement for the previous JSON-file implementation.
 * NEVER import this module in client components.
 */

import { prisma } from "@/lib/prisma";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import argon2 from "argon2";
import { encryptField, decryptField } from "@/lib/crypto";
import type { PerfilUsuario } from "@prisma/client";

export interface UserAuth {
  id: string;
  organizacaoId: string;
  nome: string;
  email: string;
  passwordHash?: string;
  perfil: PerfilUsuario;
  grupoFormacaoId?: string;
  ativo: boolean;
  criadoEm: string;
  primeiroAcesso?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaSecretExpiresAt?: Date;
  loginFailures?: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
}

export type UserPublic = Omit<UserAuth, "passwordHash">;

// ----------------------------------------------------------------
// Helpers de senha
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

// Argon2id — parâmetros recomendados pela OWASP 2024 (m=19 MiB, t=2, p=1).
// Escolha deliberada para um servidor multi-tenant de réplica única com picos de login
// simultâneos: parallelism=1 evita contenção de threads e memoryCost=19 MiB (~70% menos que
// os 64 MiB anteriores) reduz o pico de memória transitória — N logins concorrentes consomem
// N×19 MiB em vez de N×64 MiB, afastando o risco de OOM derrubar a réplica e todos os tenants.
// Os parâmetros ficam embutidos em cada hash, então hashes antigos (64 MiB/t3/p4) continuam
// sendo verificados corretamente; apenas novos hashes usam estes valores.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

// Verifies a legacy scrypt hash (format: "<salt_hex>:<key_hex>")
function verifyScrypt(password: string, stored: string): boolean {
  try {
    const colon = stored.indexOf(":");
    if (colon === -1) return false;
    const salt = stored.slice(0, colon);
    const hash = stored.slice(colon + 1);
    const key = scryptSync(password, salt, 64);
    return timingSafeEqual(key, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$argon2")) {
    try {
      return await argon2.verify(stored, password);
    } catch {
      return false;
    }
  }
  return verifyScrypt(password, stored);
}

// ----------------------------------------------------------------
// Conversão Prisma → UserAuth
// ----------------------------------------------------------------

function tryDecryptMfaSecret(encrypted: string | null): string | undefined {
  if (!encrypted) return undefined;
  try { return decryptField(encrypted); } catch { return undefined; }
}

function toUserAuth(u: {
  id: string;
  organizacaoId: string;
  nome: string;
  email: string;
  passwordHash: string | null;
  perfil: PerfilUsuario;
  grupoFormacaoId: string | null;
  ativo: boolean;
  criadoEm: Date;
  primeiroAcesso: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  mfaSecretExpiresAt: Date | null;
  loginFailures: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
}): UserAuth {
  return {
    id: u.id,
    organizacaoId: u.organizacaoId,
    nome: u.nome,
    email: u.email,
    passwordHash: u.passwordHash ?? undefined,
    perfil: u.perfil,
    grupoFormacaoId: u.grupoFormacaoId ?? undefined,
    ativo: u.ativo,
    criadoEm: u.criadoEm.toISOString().split("T")[0],
    primeiroAcesso: u.primeiroAcesso,
    mfaEnabled: u.mfaEnabled,
    mfaSecret: tryDecryptMfaSecret(u.mfaSecret),
    mfaSecretExpiresAt: u.mfaSecretExpiresAt ?? undefined,
    loginFailures: u.loginFailures,
    lockedUntil: u.lockedUntil ?? undefined,
    passwordChangedAt: u.passwordChangedAt ?? undefined,
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
    where: { organizacaoId, deletedAt: null, perfil: { not: "super_admin" } },
    ...options,
  });
  return users.map(toUserAuth);
}

export async function countUsers(organizacaoId: string): Promise<number> {
  return prisma.usuario.count({ where: { organizacaoId, deletedAt: null, perfil: { not: "super_admin" } } });
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

// Searches across all orgs — used for multi-tenant login and Google OAuth.
// orderBy criadoEm makes the result deterministic when the same e-mail exists in multiple orgs.
export async function findByEmailGlobal(email: string): Promise<UserAuth | undefined> {
  const user = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    orderBy: { criadoEm: "asc" },
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

// Upgrades a legacy scrypt hash to Argon2id after successful verification (fire-and-forget)
async function upgradeHashIfNeeded(userId: string, password: string, stored: string): Promise<void> {
  if (stored.startsWith("$argon2")) return;
  try {
    const newHash = await hashPassword(password);
    await prisma.usuario.update({ where: { id: userId }, data: { passwordHash: newHash } });
  } catch {
    // Non-fatal — user is already authenticated
  }
}

export async function authenticate(
  email: string,
  password: string,
  organizacaoId: string
): Promise<UserAuth | null> {
  const user = await findByEmail(email, organizacaoId);
  if (!user || !user.ativo || !user.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  await upgradeHashIfNeeded(user.id, password, user.passwordHash);
  return user;
}

// Multi-tenant login: searches by email across all orgs
export async function authenticateGlobal(
  email: string,
  password: string
): Promise<UserAuth | null> {
  const user = await findByEmailGlobal(email);
  if (!user || !user.ativo || !user.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  await upgradeHashIfNeeded(user.id, password, user.passwordHash);
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
  const passwordHash = await hashPassword(password);

  const commonData = {
    nome: data.nome,
    email: data.email,
    passwordHash,
    perfil: data.perfil as PerfilUsuario,
    grupoFormacaoId: data.grupoFormacaoId ?? null,
    ativo: data.ativo,
    primeiroAcesso: tempPassword !== undefined ? true : (data.primeiroAcesso ?? false),
  };

  // Um usuário previamente excluído (soft delete) mantém a linha no banco com o
  // mesmo e-mail, que continua ocupando o índice @@unique([email, organizacaoId]).
  // Como a constraint garante no máximo uma linha por (email, org), um INSERT
  // falharia com P2002. Nesse caso, revive o registro existente com os novos
  // dados em vez de criar outro.
  const softDeleted = await prisma.usuario.findFirst({
    where: {
      organizacaoId: orgId,
      email: { equals: data.email, mode: "insensitive" },
      deletedAt: { not: null },
    },
    select: { id: true },
  });

  const created = softDeleted
    ? await prisma.usuario.update({
        where: { id: softDeleted.id },
        data: { ...commonData, deletedAt: null },
      })
    : await prisma.usuario.create({
        data: { organizacaoId: orgId, ...commonData },
      });

  return { user: toUserAuth(created), tempPassword };
}

/** E-mail já pertence a outro registro da organização (ativo ou excluído). */
export class EmailConflictError extends Error {
  constructor() {
    super("E-mail já está em uso");
    this.name = "EmailConflictError";
  }
}

export async function updateUser(
  id: string,
  data: Omit<Partial<Omit<UserAuth, "id" | "criadoEm" | "passwordHash">>, "grupoFormacaoId" | "mfaSecretExpiresAt"> & {
    password?: string;
    organizacaoId: string;
    grupoFormacaoId?: string | null;
    mfaSecretExpiresAt?: Date | null;
  }
): Promise<UserAuth | null> {
  const orgId = data.organizacaoId;
  const exists = await prisma.usuario.findFirst({ where: { id, organizacaoId: orgId, deletedAt: null } });
  if (!exists) return null;

  const { password, organizacaoId: _organizacaoId, ...rest } = data;

  // Ao trocar o e-mail, rejeita se já houver QUALQUER outro registro com esse
  // e-mail na org — inclusive um usuário soft-deleted, que ainda ocupa o índice
  // @@unique([email, organizacaoId]). Nunca reaproveita/herda o registro alheio
  // numa edição: a atualização é bloqueada e o registro excluído fica intocado.
  if (rest.email !== undefined && rest.email.toLowerCase() !== exists.email.toLowerCase()) {
    const conflito = await prisma.usuario.findFirst({
      where: {
        organizacaoId: orgId,
        email: { equals: rest.email, mode: "insensitive" },
        id: { not: id },
      },
      select: { id: true },
    });
    if (conflito) throw new EmailConflictError();
  }
  const newPasswordHash = password ? await hashPassword(password) : undefined;

  const updated = await prisma.usuario.update({
    where: { id, organizacaoId: orgId },
    data: {
      ...(rest.nome !== undefined && { nome: rest.nome }),
      ...(rest.email !== undefined && { email: rest.email }),
      ...(rest.perfil !== undefined && { perfil: rest.perfil as PerfilUsuario }),
      ...(rest.grupoFormacaoId !== undefined && { grupoFormacaoId: rest.grupoFormacaoId ?? null }),
      ...(rest.ativo !== undefined && { ativo: rest.ativo }),
      ...(rest.primeiroAcesso !== undefined && { primeiroAcesso: rest.primeiroAcesso }),
      ...(rest.mfaEnabled !== undefined && { mfaEnabled: rest.mfaEnabled }),
      ...(rest.mfaSecret !== undefined && {
        mfaSecret: rest.mfaSecret ? encryptField(rest.mfaSecret) : null,
      }),
      ...("mfaSecretExpiresAt" in data && { mfaSecretExpiresAt: data.mfaSecretExpiresAt ?? null }),
      ...(newPasswordHash ? { passwordHash: newPasswordHash, passwordChangedAt: new Date() } : {}),
    },
  });
  return toUserAuth(updated);
}

export async function deleteUser(
  id: string,
  organizacaoId: string
): Promise<boolean> {
  const result = await prisma.usuario.updateMany({
    where: { id, organizacaoId, deletedAt: null },
    data: { deletedAt: new Date(), ativo: false },
  });
  return result.count > 0;
}

const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function recordLoginFailure(userId: string): Promise<void> {
  const updated = await prisma.usuario.update({
    where: { id: userId },
    data: { loginFailures: { increment: 1 } },
    select: { loginFailures: true },
  });
  if (updated.loginFailures >= MAX_LOGIN_FAILURES) {
    await prisma.usuario.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
    });
  }
}

export async function clearLoginFailures(userId: string): Promise<void> {
  await prisma.usuario.update({
    where: { id: userId },
    data: { loginFailures: 0, lockedUntil: null },
  });
}

export function toPublic(u: UserAuth): UserPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, mfaSecret: __, ...pub } = u;
  return pub;
}
