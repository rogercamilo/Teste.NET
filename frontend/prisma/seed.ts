/**
 * Seed inicial: cria a organização padrão e importa usuários existentes
 * do arquivo data/users-auth.json (se existir), ou cria o admin padrão.
 *
 * Execute com: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? "org_default";

interface LegacyUser {
  id: string;
  nome: string;
  email: string;
  passwordHash?: string;
  perfil: "administrador" | "formador_geral" | "formador_comunitario";
  moradaId?: string;
  ativo: boolean;
  criadoEm: string;
  primeiroAcesso?: boolean;
}

function generateRandomPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "@#$!%*?&";
  const all = lower + upper + digits + special;
  const pick = (cs: string) => cs[randomBytes(1)[0] % cs.length];
  const arr = [pick(lower), pick(upper), pick(digits), pick(special),
    ...Array.from(randomBytes(8), (b) => all[b % all.length])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

// Suprime aviso de parâmetro não usado
void timingSafeEqual;

async function main() {
  console.log("🌱 Iniciando seed...");

  // 1. Criar organização padrão (upsert: não falha se já existir)
  const org = await prisma.organizacao.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: {
      id: DEFAULT_ORG_ID,
      nome: process.env.SEED_ORG_NOME ?? "Comunidade Missionária Dom Bosco",
      descricao: "Gestão formativa comunitária",
      status: "ATIVO",
      planoAssinatura: "GRATUITO",
    },
  });
  console.log(`✓ Organização: ${org.nome} (${org.id})`);

  // 2. Importar usuários do arquivo legado, se existir
  const legacyFile = join(process.cwd(), "data", "users-auth.json");

  if (existsSync(legacyFile)) {
    console.log("  Importando usuários de data/users-auth.json...");
    const legacyUsers: LegacyUser[] = JSON.parse(readFileSync(legacyFile, "utf-8"));

    for (const u of legacyUsers) {
      await prisma.usuario.upsert({
        where: { id: u.id },
        update: {
          nome: u.nome,
          email: u.email,
          perfil: u.perfil,
          ativo: u.ativo,
          passwordHash: u.passwordHash ?? null,
          primeiroAcesso: u.primeiroAcesso ?? false,
          organizacaoId: DEFAULT_ORG_ID,
        },
        create: {
          id: u.id,
          organizacaoId: DEFAULT_ORG_ID,
          nome: u.nome,
          email: u.email,
          passwordHash: u.passwordHash ?? null,
          perfil: u.perfil,
          ativo: u.ativo,
          criadoEm: new Date(u.criadoEm),
          primeiroAcesso: u.primeiroAcesso ?? false,
        },
      });
      console.log(`  ✓ Usuário: ${u.email} (${u.perfil})`);
    }
  } else {
    // 3. Sem arquivo legado: criar admin padrão
    console.log("  Nenhum arquivo legado encontrado — criando admin padrão...");

    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "rogercmdb@gmail.com";
    const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? generateRandomPassword();

    const existing = await prisma.usuario.findFirst({
      where: { email: adminEmail, organizacaoId: DEFAULT_ORG_ID },
    });

    if (!existing) {
      await prisma.usuario.create({
        data: {
          organizacaoId: DEFAULT_ORG_ID,
          nome: process.env.SEED_ADMIN_NOME ?? "Administrador",
          email: adminEmail,
          passwordHash: hashPassword(seedPassword),
          perfil: "administrador",
          ativo: true,
          primeiroAcesso: true,
        },
      });

      if (!process.env.SEED_ADMIN_PASSWORD) {
        console.warn(`\n⚠️  Senha gerada automaticamente para ${adminEmail}:`);
        console.warn(`    ${seedPassword}`);
        console.warn("    Guarde esta senha — ela não será exibida novamente.\n");
      }
      console.log(`  ✓ Admin criado: ${adminEmail}`);
    } else {
      console.log(`  ⏭  Admin já existe: ${adminEmail}`);
    }
  }

  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
