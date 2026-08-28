import "server-only";

import { randomBytes, createHash } from "crypto";
import type { TipoTokenAcessoFormando } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/users-store";

/**
 * Autenticação do Portal do Formando/Vocacionado por SENHA + primeiro acesso
 * verificado por e-mail. Espelha o modelo de credenciais da equipe (`Usuario`),
 * mas o ator é o modelo `Formando` — não um `Usuario`. A sessão em si continua
 * sendo o `portal_session` (ver `portal-auth.ts`); esta lib cuida de credenciais,
 * lockout e dos tokens de ativação/reset.
 */

const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min — igual à equipe
const TOKEN_RE = /^[0-9a-f]{64}$/i;

export const ATIVACAO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

// ── Tokens de acesso (ativação / reset) ──────────────────────────────────────

function hashAccessToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Cria um token de acesso e devolve o valor BRUTO (só o hash é persistido). */
export async function createFormandoAccessToken(
  formandoId: string,
  tipo: TipoTokenAcessoFormando,
  ttlMs: number
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.formandoAccessToken.create({
    data: { formandoId, tokenHash: hashAccessToken(raw), tipo, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return raw;
}

export interface TokenPeek {
  formandoId: string;
  nome: string;
  email: string;
  organizacaoId: string;
  orgNome: string;
  grupoNome: string | null;
}

/** Valida um token SEM consumi-lo (para renderizar a tela). */
export async function peekAccessToken(
  raw: string,
  tipo: TipoTokenAcessoFormando
): Promise<TokenPeek | null> {
  if (!TOKEN_RE.test(raw)) return null;
  const tk = await prisma.formandoAccessToken.findFirst({
    where: { tokenHash: hashAccessToken(raw), tipo, usedAt: null, expiresAt: { gt: new Date() } },
    select: {
      formando: {
        select: {
          id: true,
          nome: true,
          email: true,
          ativo: true,
          deletedAt: true,
          organizacaoId: true,
          organizacao: { select: { nome: true } },
          grupoFormacao: { select: { nome: true } },
        },
      },
    },
  });
  if (!tk || tk.formando.deletedAt || !tk.formando.ativo) return null;
  return {
    formandoId: tk.formando.id,
    nome: tk.formando.nome,
    email: tk.formando.email,
    organizacaoId: tk.formando.organizacaoId,
    orgNome: tk.formando.organizacao.nome,
    grupoNome: tk.formando.grupoFormacao?.nome ?? null,
  };
}

// ── Definição de senha (ativação e reset) ────────────────────────────────────

export type SetPasswordResult =
  | { ok: true; formandoId: string; organizacaoId: string }
  | { ok: false; code: "invalid" | "conflict" };

/**
 * Consome um token e grava a senha (usado tanto pelo 1º acesso quanto pelo
 * reset). Transacional + claim atômico do token. Rejeita se o e-mail colidir
 * com outro formando que já tenha conta de portal (login é por e-mail).
 * `senha` deve ter sido validada pelo chamador (`validatePassword`).
 */
export async function definirSenhaPorToken(
  raw: string,
  senha: string,
  tipo: TipoTokenAcessoFormando
): Promise<SetPasswordResult> {
  if (!TOKEN_RE.test(raw)) return { ok: false, code: "invalid" };
  const tokenHash = hashAccessToken(raw);
  const passwordHash = await hashPassword(senha); // CPU-intensivo: fora da transação

  try {
    const res = await prisma.$transaction(async (tx) => {
      const tk = await tx.formandoAccessToken.findFirst({
        where: { tokenHash, tipo, usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, formando: { select: { id: true, email: true, organizacaoId: true, ativo: true, deletedAt: true } } },
      });
      if (!tk || tk.formando.deletedAt || !tk.formando.ativo) throw new Error("invalid");

      const conflito = await tx.formando.findFirst({
        where: {
          id: { not: tk.formando.id },
          email: { equals: tk.formando.email, mode: "insensitive" },
          deletedAt: null,
          passwordHash: { not: null },
        },
        select: { id: true },
      });
      if (conflito) throw new Error("conflict");

      const claimed = await tx.formandoAccessToken.updateMany({
        where: { id: tk.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("invalid");

      await tx.formando.update({
        where: { id: tk.formando.id },
        data: {
          passwordHash,
          primeiroAcesso: false,
          passwordChangedAt: new Date(),
          // Ativação/reset abrem sessão → conta como acesso ao portal.
          ultimoAcessoEm: new Date(),
          loginFailures: 0,
          lockedUntil: null,
        },
      });

      return { formandoId: tk.formando.id, organizacaoId: tk.formando.organizacaoId };
    });
    return { ok: true, ...res };
  } catch (err) {
    if (err instanceof Error && err.message === "conflict") return { ok: false, code: "conflict" };
    return { ok: false, code: "invalid" };
  }
}

// ── Login por e-mail + senha ─────────────────────────────────────────────────

export type LoginResult =
  | { ok: true; formandoId: string; organizacaoId: string }
  | { ok: false; code: "invalid" | "locked" };

async function recordLoginFailure(formandoId: string): Promise<void> {
  const updated = await prisma.formando.update({
    where: { id: formandoId },
    data: { loginFailures: { increment: 1 } },
    select: { loginFailures: true },
  });
  if (updated.loginFailures >= MAX_LOGIN_FAILURES) {
    await prisma.formando.update({
      where: { id: formandoId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
    });
  }
}

/**
 * Autentica por e-mail + senha. O e-mail deve resolver UM único formando com
 * conta de portal (ativo, não excluído, com senha). 0 ou ambíguo → "invalid"
 * genérico (não revela existência). Aplica lockout após 5 falhas por 15 min.
 */
export async function loginFormando(email: string, password: string): Promise<LoginResult> {
  const norm = email.trim().toLowerCase();
  const rows = await prisma.formando.findMany({
    where: { email: { equals: norm, mode: "insensitive" }, deletedAt: null, ativo: true, passwordHash: { not: null } },
    select: { id: true, passwordHash: true, organizacaoId: true, lockedUntil: true },
    take: 2,
  });
  if (rows.length !== 1) return { ok: false, code: "invalid" };
  const f = rows[0];
  if (f.lockedUntil && f.lockedUntil > new Date()) return { ok: false, code: "locked" };

  const valido = await verifyPassword(password, f.passwordHash!);
  if (!valido) {
    await recordLoginFailure(f.id);
    return { ok: false, code: "invalid" };
  }
  // Login bem-sucedido: zera falhas/lockout e registra o acesso ao portal.
  await prisma.formando.update({
    where: { id: f.id },
    data: { loginFailures: 0, lockedUntil: null, ultimoAcessoEm: new Date() },
  });
  return { ok: true, formandoId: f.id, organizacaoId: f.organizacaoId };
}
