/**
 * Recuperação de formações perdidas por soft-delete (incidente da grade
 * formativa: o antigo "apaga tudo e recria pelo nome" soft-deletava formações
 * que o cliente não reconstruía). Como o delete é lógico, as linhas continuam
 * no banco (`deletedAt != null`) e são restauráveis.
 *
 * NÃO-DESTRUTIVO por padrão (dry-run): apenas relata o alvo. Só grava com --apply.
 *
 * Critério de restauração (conservador): restaura uma formação soft-deletada
 * somente quando o seu `tema` NÃO está mais presente entre as formações VIVAS da
 * mesma grade — evita ressuscitar duplicatas e mexer no que já está correto.
 * Entre várias gerações soft-deletadas do mesmo tema, restaura a mais recente.
 *
 * Uso (o Prisma não lê .env.local — passe DATABASE_URL explicitamente):
 *   DATABASE_URL=postgres://... npx tsx scripts/recuperar-formacoes-grade.ts
 *   DATABASE_URL=postgres://... npx tsx scripts/recuperar-formacoes-grade.ts --grade=<id>
 *   DATABASE_URL=postgres://... npx tsx scripts/recuperar-formacoes-grade.ts --grade=<id> --apply
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const gradeArg = args.find((a) => a.startsWith("--grade="))?.split("=")[1];

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

async function analisarGrade(gradeId: string, gradeNome: string) {
  const [vivas, deletadas] = await Promise.all([
    prisma.formacao.findMany({
      where: { gradeId, deletedAt: null },
      select: { id: true, tema: true },
    }),
    prisma.formacao.findMany({
      where: { gradeId, deletedAt: { not: null } },
      select: { id: true, tema: true, atualizadoEm: true, deletedAt: true },
      orderBy: { atualizadoEm: "desc" },
    }),
  ]);

  const temasVivos = new Set(vivas.map((f) => norm(f.tema)));

  // Dedup: por tema, mantém apenas a geração soft-deletada mais recente.
  const porTema = new Map<string, (typeof deletadas)[number]>();
  for (const f of deletadas) {
    const k = norm(f.tema);
    if (temasVivos.has(k)) continue; // já existe viva → não recupera
    if (!porTema.has(k)) porTema.set(k, f); // deletadas já vem desc por atualizadoEm
  }
  const candidatas = [...porTema.values()];

  console.log(`\n▸ Grade "${gradeNome}" (${gradeId})`);
  console.log(`    vivas: ${vivas.length} | soft-deletadas: ${deletadas.length} | a recuperar: ${candidatas.length}`);
  for (const f of candidatas) {
    console.log(`      + ${f.tema}  (deletada em ${f.deletedAt?.toISOString()})`);
  }

  if (APPLY && candidatas.length > 0) {
    const res = await prisma.formacao.updateMany({
      where: { id: { in: candidatas.map((f) => f.id) } },
      data: { deletedAt: null },
    });
    console.log(`    ✔ restauradas: ${res.count}`);
  }
  return candidatas.length;
}

async function main() {
  console.log(APPLY ? "== MODO APPLY (irá gravar) ==" : "== DRY-RUN (nada será alterado) ==");

  let grades: { id: string; nome: string }[];
  if (gradeArg) {
    const g = await prisma.gradeFormativa.findUnique({ where: { id: gradeArg }, select: { id: true, nome: true } });
    if (!g) { console.error(`Grade ${gradeArg} não encontrada.`); return; }
    grades = [g];
  } else {
    // Todas as grades que têm ao menos uma formação soft-deletada.
    const comDeletadas = await prisma.formacao.findMany({
      where: { deletedAt: { not: null }, gradeId: { not: null } },
      select: { gradeId: true },
      distinct: ["gradeId"],
    });
    const ids = comDeletadas.map((f) => f.gradeId!).filter(Boolean);
    grades = await prisma.gradeFormativa.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  }

  let total = 0;
  for (const g of grades) total += await analisarGrade(g.id, g.nome);

  console.log(`\n${APPLY ? "Total restaurado" : "Total a recuperar (dry-run)"}: ${total}`);
  if (!APPLY && total > 0) console.log("Reveja o alvo acima e rode de novo com --apply para restaurar.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
