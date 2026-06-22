import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, createHash } from "node:crypto";

// Carrega .env.local para execuções locais; em CI as variáveis já vêm do
// ambiente do job (loadEnvConfig não sobrescreve process.env existente).
loadEnvConfig(process.cwd());

export const prisma = new PrismaClient();

export const TEST_PASSWORD = "TestE2e@2026";
export const TEST_ORG_PREFIX = "E2E Test";

export function uniqueOrgName(): string {
  return `${TEST_ORG_PREFIX} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueEmail(label = "user"): string {
  return `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// Gera um hash scrypt no formato legado "<salt_hex>:<key_hex>", aceito por
// verifyPassword() em lib/users-store.ts (sem dependência do addon nativo argon2).
export function scryptHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export async function createOrgWithAdmin(opts: {
  orgNome: string;
  adminEmail: string;
  password?: string;
  onboardingConcluido?: boolean;
}): Promise<{ orgId: string; adminId: string }> {
  const org = await prisma.organizacao.create({
    data: {
      nome: opts.orgNome,
      status: "TRIAL",
      planoAssinatura: "GRATUITO",
      onboardingConcluido: opts.onboardingConcluido ?? true,
    },
  });
  const admin = await prisma.usuario.create({
    data: {
      organizacaoId: org.id,
      nome: "Admin E2E",
      email: opts.adminEmail.toLowerCase(),
      passwordHash: scryptHash(opts.password ?? TEST_PASSWORD),
      perfil: "administrador",
      ativo: true,
      primeiroAcesso: false,
    },
  });
  return { orgId: org.id, adminId: admin.id };
}

// Cria um convite e devolve o token CRU (o banco guarda apenas o hash SHA-256).
export async function createInvite(opts: {
  organizacaoId: string;
  criadoPorId: string;
  email: string;
  nome?: string;
  perfil?: "formador_comunitario" | "administrador";
}): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);
  await prisma.conviteUsuario.create({
    data: {
      organizacaoId: opts.organizacaoId,
      email: opts.email.toLowerCase(),
      nome: opts.nome ?? "Convidado E2E",
      perfil: opts.perfil ?? "formador_comunitario",
      token: tokenHash,
      expiresAt,
      criadoPorId: opts.criadoPorId,
    },
  });
  return rawToken;
}

// Remove a organização de teste (cascata apaga usuários, convites, grupos etc.).
export async function deleteOrgByName(nome: string): Promise<void> {
  await prisma.organizacao.deleteMany({ where: { nome } });
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
