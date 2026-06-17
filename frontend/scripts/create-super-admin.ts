/**
 * Cria (ou atualiza) o usuário super_admin na organização padrão.
 *
 * Uso local:
 *   npx tsx scripts/create-super-admin.ts
 *
 * Uso em produção (Railway):
 *   railway run npx tsx scripts/create-super-admin.ts
 *
 * Variáveis opcionais de override:
 *   SUPER_ADMIN_EMAIL=...  SUPER_ADMIN_PASSWORD=...  npx tsx scripts/create-super-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? "org_default";
const SUPER_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "adm@formattio.com.br";
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "0602@Formattio#";
const SUPER_NOME = process.env.SUPER_ADMIN_NOME ?? "Super Admin Formattio";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log("🔐 Criando super admin...");
  console.log(`   Organização : ${DEFAULT_ORG_ID}`);
  console.log(`   E-mail      : ${SUPER_EMAIL}`);
  console.log(`   Nome        : ${SUPER_NOME}`);

  // Garante que a organização padrão existe
  await prisma.organizacao.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: {
      id: DEFAULT_ORG_ID,
      nome: process.env.SEED_ORG_NOME ?? "Formattio",
      descricao: "Plataforma formativa",
      status: "ATIVO",
      planoAssinatura: "GRATUITO",
    },
  });

  const passwordHash = await hashPassword(SUPER_PASSWORD);

  const existing = await prisma.usuario.findFirst({
    where: { email: { equals: SUPER_EMAIL, mode: "insensitive" }, organizacaoId: DEFAULT_ORG_ID },
  });

  if (existing) {
    await prisma.usuario.update({
      where: { id: existing.id },
      data: {
        nome: SUPER_NOME,
        passwordHash,
        perfil: "super_admin",
        ativo: true,
        primeiroAcesso: false,
        deletedAt: null,
        passwordChangedAt: new Date(),
      },
    });
    console.log(`\n✅ Usuário atualizado: ${SUPER_EMAIL} → perfil super_admin`);
  } else {
    const id = `usr_${randomBytes(8).toString("hex")}`;
    await prisma.usuario.create({
      data: {
        id,
        organizacaoId: DEFAULT_ORG_ID,
        nome: SUPER_NOME,
        email: SUPER_EMAIL,
        passwordHash,
        perfil: "super_admin",
        ativo: true,
        primeiroAcesso: false,
      },
    });
    console.log(`\n✅ Usuário criado: ${SUPER_EMAIL} → perfil super_admin`);
  }

  console.log(`   URL de acesso: https://www.formattio.com.br/acesso-plataforma`);
  console.log(`   Senha definida conforme solicitado.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
