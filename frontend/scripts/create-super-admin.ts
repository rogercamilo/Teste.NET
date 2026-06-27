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

// Org de SISTEMA dedicada ao super_admin — não é um tenant cliente. Mantida separada
// do DEFAULT_ORG_ID para que o super_admin nunca apareça dentro da org de um cliente real.
const PLATFORM_ORG_ID = process.env.PLATFORM_ORG_ID ?? "org_platform";
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
  console.log(`   Organização : ${PLATFORM_ORG_ID} (plataforma)`);
  console.log(`   E-mail      : ${SUPER_EMAIL}`);
  console.log(`   Nome        : ${SUPER_NOME}`);

  // Garante que a organização de PLATAFORMA existe (host do super_admin, não um tenant cliente)
  await prisma.organizacao.upsert({
    where: { id: PLATFORM_ORG_ID },
    update: {},
    create: {
      id: PLATFORM_ORG_ID,
      nome: "Formattio Plataforma",
      descricao: "Organização de sistema — hospeda os super admins da plataforma",
      status: "ATIVO",
      planoAssinatura: "GRATUITO",
    },
  });

  const passwordHash = await hashPassword(SUPER_PASSWORD);

  const existing = await prisma.usuario.findFirst({
    where: { email: { equals: SUPER_EMAIL, mode: "insensitive" }, organizacaoId: PLATFORM_ORG_ID },
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
        organizacaoId: PLATFORM_ORG_ID,
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
