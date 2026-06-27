/**
 * Migração de dados (idempotente): move todos os usuários `super_admin` para uma
 * organização de SISTEMA dedicada (`org_platform`), em vez de ficarem hospedados
 * dentro de uma organização de tenant real (ex.: `org_default`).
 *
 * Contexto: `Usuario.organizacaoId` é não-nulável, então todo super_admin precisa
 * de uma org. Mantê-lo dentro de um tenant cliente faz com que ele apareça como
 * usuário daquela org. A correção é uma org de plataforma própria — que o cockpit
 * super-admin exclui de todas as listagens/contagens (ver `excludePlatformOrgWhere`).
 *
 * Uso local:
 *   npx tsx scripts/migrate-super-admin-to-platform-org.ts
 *
 * Uso em produção (Railway — usar o endpoint PÚBLICO do Postgres):
 *   DATABASE_URL="postgresql://postgres:<pass>@<host>.proxy.rlwy.net:<port>/railway" \
 *     npx tsx scripts/migrate-super-admin-to-platform-org.ts
 *
 * Override opcional: PLATFORM_ORG_ID=org_platform
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORM_ORG_ID = process.env.PLATFORM_ORG_ID ?? "org_platform";

async function main() {
  console.log("🔧 Migrando super_admins para a org de plataforma...");
  console.log(`   Org de plataforma: ${PLATFORM_ORG_ID}`);

  // 1) Garante a org de sistema
  const platformOrg = await prisma.organizacao.upsert({
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
  console.log(`   ✓ Org garantida: ${platformOrg.nome}`);

  // 2) Encontra todos os super_admins que ainda NÃO estão na org de plataforma
  const superAdmins = await prisma.usuario.findMany({
    where: { perfil: "super_admin", organizacaoId: { not: PLATFORM_ORG_ID } },
    select: { id: true, email: true, organizacaoId: true },
  });

  if (superAdmins.length === 0) {
    console.log("\n✅ Nenhum super_admin para mover — tudo já está correto.");
    return;
  }

  console.log(`\n   ${superAdmins.length} super_admin(s) a mover:`);
  for (const sa of superAdmins) {
    console.log(`     - ${sa.email}  (${sa.organizacaoId} → ${PLATFORM_ORG_ID})`);
  }

  // 3) Move cada um. O índice @@unique([email, organizacaoId]) não conflita porque
  //    o destino é uma org diferente; em tese poderia colidir se já houvesse um
  //    super_admin com o mesmo e-mail na org de plataforma — tratamos com try/catch.
  let moved = 0;
  for (const sa of superAdmins) {
    try {
      await prisma.usuario.update({
        where: { id: sa.id },
        data: { organizacaoId: PLATFORM_ORG_ID },
      });
      moved++;
    } catch (e) {
      console.error(`     ✗ Falha ao mover ${sa.email}:`, (e as Error).message);
    }
  }

  console.log(`\n✅ ${moved}/${superAdmins.length} super_admin(s) movido(s) para ${PLATFORM_ORG_ID}.`);
  console.log("   Sessões ativas se auto-corrigem na próxima revalidação do JWT (≤30s) ou no próximo login.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
