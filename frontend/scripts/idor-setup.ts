/**
 * IDOR test harness — setup.
 *
 * Cria DUAS organizações isoladas (A e B) com um admin cada, mais uma linha de
 * Arquivo na Org B (alvo de /api/arquivos/[id], que não tem POST JSON simples).
 *
 * Idempotente: pode rodar várias vezes. Imprime um JSON com IDs/credenciais que
 * o idor-test.ts consome via stdin/arquivo.
 *
 * Uso:
 *   DATABASE_URL=postgresql://formativo:formativo_dev@localhost:5432/formacao_comunitaria \
 *     npx tsx scripts/idor-setup.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

const PASSWORD = "IdorTest!2026";

async function ensureOrg(id: string, nome: string) {
  // PERSONALIZADO = limites infinitos: evita os gates de assinatura/limite ao semear
  // formandos/uploads, sem mascarar os checks de isolamento (que independem do plano).
  return prisma.organizacao.upsert({
    where: { id },
    update: { status: "ATIVO", planoAssinatura: "PERSONALIZADO" },
    create: { id, nome, descricao: "IDOR test org", status: "ATIVO", planoAssinatura: "PERSONALIZADO" },
  });
}

async function ensureAdmin(orgId: string, email: string, nome: string) {
  const existing = await prisma.usuario.findFirst({ where: { email, organizacaoId: orgId } });
  if (existing) {
    // garante senha conhecida + ativo + sem primeiro acesso
    await prisma.usuario.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(PASSWORD), ativo: true, primeiroAcesso: false, perfil: "administrador", lockedUntil: null, loginFailures: 0 },
    });
    return existing;
  }
  return prisma.usuario.create({
    data: {
      organizacaoId: orgId,
      nome,
      email,
      passwordHash: hashPassword(PASSWORD),
      perfil: "administrador",
      ativo: true,
      primeiroAcesso: false,
    },
  });
}

async function main() {
  const orgA = await ensureOrg("org_idor_a", "IDOR Org A");
  const orgB = await ensureOrg("org_idor_b", "IDOR Org B");

  const adminA = await ensureAdmin(orgA.id, "idor-admin-a@example.test", "Admin A");
  const adminB = await ensureAdmin(orgB.id, "idor-admin-b@example.test", "Admin B");

  // Arquivo alvo na Org B (não há POST JSON; semeia direto)
  let arquivoB = await prisma.arquivo.findFirst({ where: { organizacaoId: orgB.id, nome: "idor-target.pdf" } });
  if (!arquivoB) {
    arquivoB = await prisma.arquivo.create({
      data: {
        organizacaoId: orgB.id,
        nome: "idor-target.pdf",
        tamanho: 10,
        tipo: "application/pdf",
        extensao: ".pdf",
        storageKey: "idor/target.pdf",
        uploadedById: adminB.id,
        uploadedByNome: adminB.nome,
      },
    });
  }

  const out = {
    password: PASSWORD,
    orgA: { id: orgA.id, adminEmail: adminA.email, adminId: adminA.id },
    orgB: { id: orgB.id, adminEmail: adminB.email, adminId: adminB.id, arquivoId: arquivoB.id },
  };
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error("setup error", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
