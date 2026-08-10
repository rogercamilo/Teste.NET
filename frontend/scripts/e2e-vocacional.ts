/**
 * SMOKE DE DADOS do módulo Período Vocacional contra o banco de dev (NÃO é um
 * teste de rota HTTP). Exercita o motor real (lavrarTermo, crypto), a máquina de
 * estados e as invariantes de negócio — reversão não-destrutiva, cancelamento por
 * retificação, foro íntimo cifrado, presença escopada à turma. Limpa tudo ao final.
 *
 * ⚠️ Escopo e drift: este script **replica** a lógica das transações das rotas
 * (inscrição/encerramento/cancelamento) para validar a camada de DADOS + Livro
 * contra um Postgres real — ele NÃO sobe o servidor nem exerce os *handlers*
 * (auth/guards, isolamento de tenant, parsing, 409). Essa cobertura de handler
 * vive nos testes de rota mockados em `src/__tests__/api/vocacional-routes.test.ts`
 * (authz/tenant/409) — a fonte de verdade do comportamento HTTP. Ao mudar a lógica
 * de uma rota, atualize o handler + seu teste mockado primeiro; este smoke pode
 * divergir e serve apenas como verificação de integração de dados ponta a ponta.
 *
 * Run: npx tsx scripts/e2e-vocacional.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^(DATABASE_URL|APP_ENCRYPTION_KEY|AUTH_SECRET)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { lavrarTermo, parseDataLocal } from "@/lib/livro-registro";
import { encryptField, decryptField } from "@/lib/crypto";
import { verificarUltimoRetiroVocacional } from "@/lib/vocacional-triggers";
import { validarElegibilidadeVocacional } from "@/lib/vocacional-rules";
import { getPortalDashboardData } from "@/lib/portal-data";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const TAG = "E2E-VOC-" + Date.now();
let pass = 0, fail = 0;
function check(cond: boolean, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

// Replica a transação de inscrição da rota POST /participacoes (captura de origem).
async function inscrever(orgId: string, turmaId: string, turmaFormadorId: string, formando: { id: string; nome: string; grupoFormacaoId: string | null; condicaoAtual: string | null }, adminId: string) {
  const dataIngresso = parseDataLocal("2026-03-15");
  return prisma.$transaction(async (tx) => {
    const p = await tx.participacaoVocacional.create({
      data: {
        organizacaoId: orgId, formandoId: formando.id, turmaId, status: "ativa", dataIngresso,
        acompanhadorId: turmaFormadorId, grupoOrigemId: formando.grupoFormacaoId, condicaoOrigem: formando.condicaoAtual as never,
      },
    });
    await tx.formando.update({ where: { id: formando.id }, data: { grupoFormacaoId: turmaId, condicaoAtual: "candidato" } });
    const termo = await lavrarTermo(tx, {
      organizacaoId: orgId, tipo: "ingresso_vocacional", formandoId: formando.id, dataEvento: dataIngresso,
      contexto: { formandoNome: formando.nome, dataEvento: dataIngresso }, criadoPorId: adminId,
    });
    await tx.participacaoVocacional.update({ where: { id: p.id }, data: { termoIngressoId: termo.id } });
    return p.id;
  });
}

async function main() {
  await prisma.organizacao.deleteMany({ where: { nome: { startsWith: "E2E-VOC" } } });

  const org = await prisma.organizacao.create({ data: { nome: `${TAG} Org`, tipoOrganizacao: "nova_comunidade", vocacionalHabilitado: true } });
  const admin = await prisma.usuario.create({ data: { organizacaoId: org.id, nome: `${TAG} Admin`, email: `${TAG}@t.dev`, perfil: "administrador" } });
  await prisma.livroRegistroTomo.create({ data: { organizacaoId: org.id, numero: 1, status: "aberto", aberturaData: new Date(), aberturaModerador: "Mod", aberturaSecretario: "Sec", aberturaTexto: "abertura" } });
  const turma = await prisma.grupoFormacao.create({ data: { organizacaoId: org.id, nome: `${TAG} Turma`, tipo: "vocacional", nivelFormativo: null, formadorId: admin.id, vigenciaInicio: new Date(), vocacionalTotalRetiros: 1, vocacionalAcompanhamentoAtivo: true } });
  // Grupo de origem (ex.: grupo de oração) onde o vocacionado já estava.
  const grupoOrigem = await prisma.grupoFormacao.create({ data: { organizacaoId: org.id, nome: `${TAG} Origem`, tipo: "livre", nivelFormativo: null } });
  const mkFormando = (sufixo: string) => prisma.formando.create({ data: { organizacaoId: org.id, nome: `Formando ${sufixo}`, dataNascimento: new Date("2000-01-01"), estadoCivil: "solteiro", modalidade: "presencial", nivelFormativo: "pre-discipulado", dataIngresso: new Date(), telefone: "85999999999", email: `${TAG}-${sufixo}@t.dev`, grupoFormacaoId: grupoOrigem.id } });

  // ── [1] Inscrição (deferida) — captura de origem ────────────────────────────
  console.log("\n[1] Inscrição do vocacionado (lavra ingresso + captura origem)");
  const f1 = await mkFormando("Deferido");
  const part1 = await inscrever(org.id, turma.id, admin.id, f1, admin.id);
  const p1 = await prisma.participacaoVocacional.findUnique({ where: { id: part1 } });
  const termoIngresso = await prisma.termoRegistro.findFirst({ where: { organizacaoId: org.id, tipo: "ingresso_vocacional", formandoId: f1.id } });
  const f1After = await prisma.formando.findUnique({ where: { id: f1.id } });
  check(!!termoIngresso && termoIngresso.condicaoResultante === "candidato", "termo ingresso lavrado (condição candidato)");
  check(termoIngresso?.corpoTexto.includes("Período Vocacional") ?? false, "corpo cita o Período Vocacional");
  check(f1After?.condicaoAtual === "candidato" && f1After?.grupoFormacaoId === turma.id, "formando vira candidato na turma");
  check(p1?.grupoOrigemId === grupoOrigem.id && p1?.condicaoOrigem === null, "origem capturada (grupo + condição)");
  check(p1?.termoIngressoId === termoIngresso?.id, "termo de ingresso ligado à participação");

  // ── [2] Elegibilidade (regra pura, espelha a rota) ──────────────────────────
  console.log("\n[2] Elegibilidade da inscrição");
  check(validarElegibilidadeVocacional({ condicaoAtual: "membro_consagrado", temParticipacaoEmAndamento: false }).ok === false, "membro formal é recusado");
  check(validarElegibilidadeVocacional({ condicaoAtual: "candidato", temParticipacaoEmAndamento: true }).ok === false, "dupla participação é recusada");
  check(validarElegibilidadeVocacional({ condicaoAtual: null, temParticipacaoEmAndamento: false }).ok === true, "não-formal é aceito");

  // ── [3] Acompanhamento cifrado ──────────────────────────────────────────────
  console.log("\n[3] Acompanhamento individual (cifrado)");
  const segredo = "Evolução do discernimento — sigiloso.";
  const nota = await prisma.acompanhamentoVocacional.create({ data: { organizacaoId: org.id, participacaoId: part1, acompanhadorId: admin.id, data: new Date(), tipo: "mensal", anotacaoEvolucao: encryptField(segredo) } });
  const notaRaw = await prisma.acompanhamentoVocacional.findUnique({ where: { id: nota.id } });
  check((notaRaw?.anotacaoEvolucao.startsWith("enc:v1:") ?? false) || !process.env.APP_ENCRYPTION_KEY, "anotação cifrada em repouso");
  check(decryptField(notaRaw!.anotacaoEvolucao) === segredo, "anotação decifra para o original");

  // ── [4] Conclusão deferida — restaura grupo de origem (não orfana) ──────────
  console.log("\n[4] Conclusão deferida (término + processo + restaura grupo de origem)");
  const dataConclusao = parseDataLocal("2026-09-20");
  await prisma.$transaction(async (tx) => {
    await lavrarTermo(tx, { organizacaoId: org.id, tipo: "termino_vocacional", formandoId: f1.id, dataEvento: dataConclusao, contexto: { formandoNome: f1.nome, dataEvento: dataConclusao, motivo: "com o deferimento do pedido de ingresso à jornada formativa" }, criadoPorId: admin.id });
    const proc = await tx.processoEclesiastico.create({ data: { organizacaoId: org.id, formandoId: f1.id, tipo: "inicio_vocacional", nivelFormativo: "pre-discipulado", status: "rascunho", dadosFormulario: {}, criadoPorId: admin.id } });
    await tx.participacaoVocacional.update({ where: { id: part1 }, data: { status: "concluida_deferida", dataConclusao, processoGeradoId: proc.id } });
    await tx.formando.update({ where: { id: f1.id }, data: { grupoFormacaoId: grupoOrigem.id } });
  });
  const termoTermino = await prisma.termoRegistro.findFirst({ where: { organizacaoId: org.id, tipo: "termino_vocacional", formandoId: f1.id } });
  const proc = await prisma.processoEclesiastico.findFirst({ where: { organizacaoId: org.id, formandoId: f1.id, tipo: "inicio_vocacional" } });
  const f1Final = await prisma.formando.findUnique({ where: { id: f1.id } });
  check(!!termoTermino && termoTermino.condicaoResultante == null, "termo término lavrado (não altera condição)");
  check(proc?.status === "rascunho", "processo de admissão criado (rascunho)");
  check(f1Final?.grupoFormacaoId === grupoOrigem.id, "deferida restaura grupo de origem (não orfana)");

  // ── [5] Recusa — restaura grupo E condição anteriores ───────────────────────
  console.log("\n[5] Recusa (restaura grupo + condição de origem)");
  const f2 = await mkFormando("Recusado");
  const part2 = await inscrever(org.id, turma.id, admin.id, f2, admin.id);
  await prisma.$transaction(async (tx) => {
    const pp = await tx.participacaoVocacional.findUnique({ where: { id: part2 } });
    await lavrarTermo(tx, { organizacaoId: org.id, tipo: "termino_vocacional", formandoId: f2.id, dataEvento: new Date(), contexto: { formandoNome: f2.nome, dataEvento: new Date(), motivo: "por recusa do(a) candidato(a) em prosseguir" }, criadoPorId: admin.id });
    await tx.participacaoVocacional.update({ where: { id: part2 }, data: { status: "recusada_arquivada", dataConclusao: new Date() } });
    await tx.formando.update({ where: { id: f2.id }, data: { grupoFormacaoId: pp!.grupoOrigemId, condicaoAtual: pp!.condicaoOrigem } });
  });
  const f2Final = await prisma.formando.findUnique({ where: { id: f2.id } });
  check(f2Final?.grupoFormacaoId === grupoOrigem.id && f2Final?.condicaoAtual === null, "recusa reverte grupo + condição ao estado anterior");

  // ── [6] Cancelamento administrativo — retificação + restauração ─────────────
  console.log("\n[6] Cancelamento por equívoco (retificação no Livro + restaura)");
  const f3 = await mkFormando("Cancelado");
  const part3 = await inscrever(org.id, turma.id, admin.id, f3, admin.id);
  const p3 = await prisma.participacaoVocacional.findUnique({ where: { id: part3 } });
  const termoIngr3 = await prisma.termoRegistro.findUnique({ where: { id: p3!.termoIngressoId! }, select: { numero: true } });
  await prisma.$transaction(async (tx) => {
    await lavrarTermo(tx, { organizacaoId: org.id, tipo: "retificacao", formandoId: f3.id, dataEvento: new Date(), contexto: { formandoNome: f3.nome, dataEvento: new Date(), retificaTermoNumero: termoIngr3?.numero, retificaDescricao: "para cancelar o assento de ingresso no Período Vocacional, lavrado por equívoco administrativo" }, retificaTermoId: p3!.termoIngressoId, criadoPorId: admin.id, lavradoAutomaticamente: false });
    await tx.participacaoVocacional.update({ where: { id: part3 }, data: { status: "cancelada", dataConclusao: new Date() } });
    await tx.formando.update({ where: { id: f3.id }, data: { grupoFormacaoId: p3!.grupoOrigemId, condicaoAtual: p3!.condicaoOrigem } });
  });
  const termoRetif = await prisma.termoRegistro.findFirst({ where: { organizacaoId: org.id, tipo: "retificacao", formandoId: f3.id } });
  const f3Final = await prisma.formando.findUnique({ where: { id: f3.id } });
  const p3Final = await prisma.participacaoVocacional.findUnique({ where: { id: part3 } });
  check(!!termoRetif && termoRetif.corpoTexto.includes("Retifica-se"), "retificação lavrada no Livro");
  check(termoRetif?.retificaTermoId === p3!.termoIngressoId, "retificação referencia o termo de ingresso");
  check(p3Final?.status === "cancelada", "participação marcada como cancelada");
  check(f3Final?.grupoFormacaoId === grupoOrigem.id && f3Final?.condicaoAtual === null, "cancelamento restaura o estado anterior do formando");

  // ── [7] Gatilho do último retiro ────────────────────────────────────────────
  console.log("\n[7] Gatilho do último retiro");
  const formacao = await prisma.formacao.create({ data: { organizacaoId: org.id, tema: "Retiro", objetivo: "—", descricao: "—", cargaHoraria: 8, modalidade: "presencial", nivelFormativo: "pre-discipulado", tipoFormacao: "retiro-comunitario" } });
  await prisma.agendamento.create({ data: { organizacaoId: org.id, formacaoId: formacao.id, formacaoTema: "Retiro", nivelFormativo: "pre-discipulado", tipoFormacao: "retiro-comunitario", formadorId: admin.id, formadorNome: admin.nome, grupoFormacaoId: turma.id, dataInicio: new Date(), dataFim: new Date(), status: "realizada" } });
  const f4 = await mkFormando("Retiro");
  const part4 = await inscrever(org.id, turma.id, admin.id, f4, admin.id);
  await verificarUltimoRetiroVocacional(turma.id);
  const p4 = await prisma.participacaoVocacional.findUnique({ where: { id: part4 } });
  check(p4?.status === "aguardando_carta", "ativa → aguardando_carta no último retiro");

  // ── [8] Portal do Vocacionado — presença escopada à turma (item 5) ──────────
  console.log("\n[8] Portal: presença do vocacional escopada à turma (não ao nível)");
  const f5 = await mkFormando("Portal");
  await inscrever(org.id, turma.id, admin.id, f5, admin.id);
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ag = await prisma.agendamento.create({ data: { organizacaoId: org.id, formacaoId: formacao.id, formacaoTema: "Encontro vocacional", nivelFormativo: "discipulado", tipoFormacao: "comunitaria", formadorId: admin.id, formadorNome: admin.nome, grupoFormacaoId: turma.id, dataInicio: ontem, dataFim: ontem, status: "realizada" } });
  // Presença com nivelFormativo DIFERENTE do nível do formando (pre-discipulado):
  // o escopo correto é por turma; o filtro antigo por nível não a contaria.
  await prisma.presencaFormacao.create({ data: { organizacaoId: org.id, agendamentoId: ag.id, formacaoTema: "Encontro vocacional", data: ontem, formandoId: f5.id, formandoNome: f5.nome, nivelFormativo: "discipulado", presente: true } });
  const dash = await getPortalDashboardData(f5.id, org.id);
  check(dash?.presenca.total === 1 && dash?.presenca.presentes === 1, "presença do vocacional é contada (escopo por turma)");
  check(dash?.presenca.percentual === 100, "percentual de presença correto (100%)");
  check(dash?.progresso === null, "progresso de etapa oculto para o candidato");
  check(dash?.vocacional?.status === "ativa", "card do período vocacional presente no portal");

  await prisma.organizacao.delete({ where: { id: org.id } });
  console.log(`\nResultado: ${pass} ok, ${fail} falhas\n`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
