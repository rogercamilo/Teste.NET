/**
 * Seed de teste para o Portal do Vocacionado (uso local apenas).
 * Popula o CAMINHO FELIZ COMPLETO — todos os campos que o dashboard renderiza
 * para um vocacionado ficam preenchidos com dados coerentes:
 *   • Saudação (nome, nível, turma vocacional)
 *   • Minha presença (histórico + percentual)
 *   • Minha jornada vocacional (participação ATIVA + acompanhamento disponível)
 *   • Próximos encontros (com local, RSVP confirmável e já confirmado)
 *   • Materiais das formações (objetivo + descrição + apoio + anexo PDF real)
 *   • Histórico de presença
 * Ao final imprime um LINK DE ATIVAÇÃO pronto para definir a senha e abrir o
 * dashboard já povoado.
 *
 * Run (a partir de frontend/):
 *   npx tsx scripts/seed-vocacional-test.ts
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { randomBytes, createHash } from "node:crypto";

// Carrega env do .env.local (Prisma/tsx não leem sozinhos). Inclui o R2 para que
// o anexo suba no MESMO storage que o app usa em dev.
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(
    /^(DATABASE_URL|AUTH_SECRET|NEXTAUTH_URL|R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME)=(.*)$/
  );
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG = "org_default";
const FORMADOR = "u2"; // Carlos Mendes (formador_comunitario) — acompanhador
const TURMA_ID = "grp_vocacional_test";
const FORMANDO_ID = "fmd_vocacional_test";
const PARTICIPACAO_ID = "pv_vocacional_test";
const EMAIL = "vocacional.teste@formattio.dev";
const NOME = "João Discernidor";
const NIVEL = "discipulado"; // nível de origem; preservado durante o período
const ARQUIVO_ID = "arq_vocacional_test";
const ANEXO_NOME = "Roteiro de Discernimento — Vontade de Deus.pdf";
const STORAGE_KEY = `org_${ORG}/formacao/vocacional-test-material.pdf`;

const R2_ENABLED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

/** PDF de uma página, válido (xref com offsets calculados). */
function buildMinimalPdf(linhas: string[]): Buffer {
  const enc = (s: string) => Buffer.byteLength(s, "latin1");
  let body = "%PDF-1.4\n";
  const off: Record<number, number> = {};
  const addObj = (num: number, content: string) => {
    off[num] = enc(body);
    body += `${num} 0 obj\n${content}\nendobj\n`;
  };
  const stream =
    "BT /F1 16 Tf 40 200 Td 20 TL " +
    linhas.map((l) => `(${l.replace(/([()\\])/g, "\\$1")}) Tj T*`).join(" ") +
    " ET";
  addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 260] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
  );
  addObj(4, `<< /Length ${enc(stream)} >>\nstream\n${stream}\nendstream`);
  addObj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const xrefPos = enc(body);
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) xref += String(off[i]).padStart(10, "0") + " 00000 n \n";
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(body + xref + trailer, "latin1");
}

/** Grava o anexo no mesmo storage do app (R2 em dev; disco local como fallback). */
async function storeAnexo(buffer: Buffer): Promise<void> {
  if (R2_ENABLED) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: STORAGE_KEY,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );
    return;
  }
  const full = join(process.cwd(), "data", "uploads", STORAGE_KEY);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, buffer);
}

// Templates de Formação (dão o material das formações realizadas). Cada um é
// totalmente preenchido — objetivo, descrição e material de apoio; o primeiro
// carrega também o anexo PDF.
const FORMACOES = [
  {
    id: "fmc_voc_discernimento",
    tema: "Discernimento e Vontade de Deus",
    objetivo: "Reconhecer os sinais da vontade de Deus na própria história.",
    descricao:
      "Encontro sobre os fundamentos do discernimento vocacional: consolações, desolações e a escuta orante da Palavra.",
    materialApoio:
      "Leitura: Regras de Discernimento (Sto. Inácio), 1ª semana.\nSalmo 139 — “Senhor, tu me sondas e me conheces”.\nVídeo de apoio: https://exemplo.org/discernimento",
    tipoFormacao: "comunitaria",
    anexo: true,
  },
  {
    id: "fmc_voc_oracao",
    tema: "Vida de Oração no Período Vocacional",
    objetivo: "Estabelecer um método pessoal de oração diária.",
    descricao:
      "A oração como lugar do chamado: lectio divina, exame de consciência e direção espiritual.",
    materialApoio:
      "Roteiro de lectio divina (João 15).\nSugestão: 20 min de silêncio diário antes do exame da noite.",
    tipoFormacao: "comunitaria",
    anexo: false,
  },
  {
    id: "fmc_voc_retiro",
    tema: "Retiro de Discernimento",
    objetivo: "Aprofundar, em silêncio, a moção vocacional percebida.",
    descricao:
      "Retiro de fim de semana com meditações guiadas, adoração e acompanhamento individual.",
    materialApoio: "Programação do retiro e horários de acompanhamento pessoal em anexo ao mural.",
    tipoFormacao: "retiro-comunitario",
    anexo: false,
  },
] as const;

async function main() {
  // 0. Destrava o módulo vocacional no tenant (menu + Livro + portal).
  await prisma.organizacao.update({
    where: { id: ORG },
    data: { vocacionalHabilitado: true },
  });

  // 1. Turma vocacional (morada tipo=vocacional) com acompanhamento ativo.
  await prisma.grupoFormacao.upsert({
    where: { id: TURMA_ID },
    update: { vocacionalAcompanhamentoAtivo: true, ativo: true },
    create: {
      id: TURMA_ID,
      organizacaoId: ORG,
      nome: "Turma Vocacional São Miguel",
      tipo: "vocacional",
      localReuniao: "Casa de Retiros N. Sra.",
      formadorId: FORMADOR,
      vocacionalAcompanhamentoAtivo: true,
      vocacionalTotalRetiros: 4,
      vocacionalDuracaoMeses: 18,
      vigenciaInicio: dias(-120),
    },
  });

  // 2. Vocacionado vinculado à turma.
  await prisma.formando.upsert({
    where: { id: FORMANDO_ID },
    update: { email: EMAIL, ativo: true, deletedAt: null, grupoFormacaoId: TURMA_ID, nivelFormativo: NIVEL },
    create: {
      id: FORMANDO_ID,
      organizacaoId: ORG,
      nome: NOME,
      dataNascimento: new Date("1993-08-22"),
      estadoCivil: "solteiro",
      modalidade: "presencial",
      nivelFormativo: NIVEL,
      dataIngresso: dias(-500),
      telefone: "(11) 90000-1111",
      email: EMAIL,
      grupoFormacaoId: TURMA_ID,
    },
  });

  // 3. Participação vocacional ATIVA (faz o login cair no portal vocacional).
  await prisma.participacaoVocacional.upsert({
    where: { id: PARTICIPACAO_ID },
    update: { status: "ativa", turmaId: TURMA_ID, acompanhadorId: FORMADOR },
    create: {
      id: PARTICIPACAO_ID,
      organizacaoId: ORG,
      formandoId: FORMANDO_ID,
      turmaId: TURMA_ID,
      status: "ativa",
      dataIngresso: dias(-120),
      acompanhadorId: FORMADOR,
    },
  });

  // 3b. Indicação de leitura da turma (Travessia de Leitura — Fatia 1).
  const LEITURA_ID = "leit_voc_imitacao";
  const CAPITULOS = [
    "O menosprezo das vaidades do mundo",
    "Humilde sentir de si mesmo",
    "A doutrina da verdade",
    "A prudência no agir",
    "A leitura das Sagradas Escrituras",
    "Os afetos desordenados",
    "Fugir da vã esperança e da soberba",
  ];
  await prisma.leituraVocacional.upsert({
    where: { id: LEITURA_ID },
    update: { titulo: "A Imitação de Cristo", autor: "Tomás de Kempis", ativo: true },
    create: {
      id: LEITURA_ID,
      organizacaoId: ORG,
      turmaId: TURMA_ID,
      titulo: "A Imitação de Cristo",
      autor: "Tomás de Kempis",
      ordem: 0,
      capitulos: { create: CAPITULOS.map((titulo, i) => ({ numero: i + 1, titulo })) },
    },
  });

  // 3c. Progresso de leitura do vocacionado (Fatia 2): 2 primeiros capítulos
  // lidos, para a Trilha da Travessia já surgir com Frutos no portal.
  const capsLidos = await prisma.capituloLeitura.findMany({
    where: { leituraId: LEITURA_ID, numero: { in: [1, 2] } },
    select: { id: true },
  });
  for (const c of capsLidos) {
    await prisma.acaoLeitura.upsert({
      where: { formandoId_capituloId_tipo: { formandoId: FORMANDO_ID, capituloId: c.id, tipo: "leitura" } },
      update: {},
      create: {
        organizacaoId: ORG,
        formandoId: FORMANDO_ID,
        leituraId: LEITURA_ID,
        capituloId: c.id,
        tipo: "leitura",
        frutos: 1,
      },
    });
  }

  // 3d. Partilha textual do capítulo 1 (Fatia 3): reflexão que rende Fruto e
  // aparece ao formador no painel de progresso.
  if (capsLidos[0]) {
    await prisma.acaoLeitura.upsert({
      where: { formandoId_capituloId_tipo: { formandoId: FORMANDO_ID, capituloId: capsLidos[0].id, tipo: "partilha" } },
      update: {},
      create: {
        organizacaoId: ORG,
        formandoId: FORMANDO_ID,
        leituraId: LEITURA_ID,
        capituloId: capsLidos[0].id,
        tipo: "partilha",
        frutos: 3,
        texto: "Este capítulo me ajudou a entender que discernir é, antes de tudo, escutar em oração. Senti paz ao rezar com a Palavra.",
      },
    });
  }

  // 4. Templates de Formação + anexo PDF real (na primeira formação).
  const pdf = buildMinimalPdf([
    "Roteiro de Discernimento — Vontade de Deus",
    "",
    "Formattio · Portal do Vocacionado (seed de teste)",
    "Consolacao, desolacao e escuta orante da Palavra.",
  ]);
  await storeAnexo(pdf);
  await prisma.arquivo.upsert({
    where: { id: ARQUIVO_ID },
    update: { storageKey: STORAGE_KEY, tamanho: pdf.length, nome: ANEXO_NOME },
    create: {
      id: ARQUIVO_ID,
      organizacaoId: ORG,
      nome: ANEXO_NOME,
      tamanho: pdf.length,
      tipo: "application/pdf",
      extensao: ".pdf",
      storageKey: STORAGE_KEY,
      uploadedById: FORMADOR,
      uploadedByNome: "Carlos Mendes",
      entityType: "formacao",
      entityId: FORMACOES[0].id,
    },
  });

  for (const f of FORMACOES) {
    await prisma.formacao.upsert({
      where: { id: f.id },
      update: {
        objetivo: f.objetivo,
        descricao: f.descricao,
        materialApoio: f.materialApoio,
        ...(f.anexo ? { documentoAnexo: ANEXO_NOME, documentoAnexoId: ARQUIVO_ID } : {}),
      },
      create: {
        id: f.id,
        organizacaoId: ORG,
        tema: f.tema,
        objetivo: f.objetivo,
        descricao: f.descricao,
        materialApoio: f.materialApoio,
        nivelFormativo: NIVEL,
        tipoFormacao: f.tipoFormacao,
        formadorNome: "Carlos Mendes",
        cargaHoraria: f.tipoFormacao === "retiro-comunitario" ? 16 : 2,
        modalidade: "presencial",
        ...(f.anexo ? { documentoAnexo: ANEXO_NOME, documentoAnexoId: ARQUIVO_ID } : {}),
      },
    });
  }

  // 5. Limpa encontros de execuções anteriores deste seed (prefixo agd_voc_),
  //    para que re-runs deixem exatamente o conjunto do caminho feliz — sem
  //    faltas/duplicatas herdadas.
  await prisma.presencaFormacao.deleteMany({
    where: { formandoId: FORMANDO_ID, agendamentoId: { startsWith: "agd_voc_" } },
  });
  await prisma.agendamento.deleteMany({ where: { id: { startsWith: "agd_voc_" } } });

  // 5b. Encontros da turma vocacional.
  //  • Passados (data < agora): alimentam presença/histórico + materiais.
  //    Todos presentes → caminho feliz (100%).
  //  • Futuros: exercitam o RSVP (um já confirmado, um a confirmar).
  const encontros: Array<{
    id: string;
    formacaoId: string;
    tema: string;
    tipoFormacao: string;
    inicio: Date;
    presente: boolean;
    conf: boolean | null;
    podeResponder: boolean;
  }> = [
    // Passados — presentes e confirmados
    { id: "agd_voc_p1", formacaoId: "fmc_voc_discernimento", tema: "Discernimento e Vontade de Deus", tipoFormacao: "comunitaria", inicio: dias(-40), presente: true, conf: true, podeResponder: false },
    { id: "agd_voc_p2", formacaoId: "fmc_voc_oracao", tema: "Vida de Oração no Período Vocacional", tipoFormacao: "comunitaria", inicio: dias(-25), presente: true, conf: true, podeResponder: false },
    { id: "agd_voc_p3", formacaoId: "fmc_voc_retiro", tema: "Retiro de Discernimento", tipoFormacao: "retiro-comunitario", inicio: dias(-12), presente: true, conf: true, podeResponder: false },
    // Futuros — RSVP
    { id: "agd_voc_f1", formacaoId: "fmc_voc_oracao", tema: "Encontro de Partilha da Turma", tipoFormacao: "comunitaria", inicio: dias(4), presente: false, conf: true, podeResponder: true },
    { id: "agd_voc_f2", formacaoId: "fmc_voc_retiro", tema: "Retiro de Meio de Caminho", tipoFormacao: "retiro-comunitario", inicio: dias(18), presente: false, conf: null, podeResponder: true },
  ];

  for (const e of encontros) {
    await prisma.agendamento.upsert({
      where: { id: e.id },
      update: { dataInicio: e.inicio, dataFim: new Date(e.inicio.getTime() + 3 * 60 * 60 * 1000) },
      create: {
        id: e.id,
        organizacaoId: ORG,
        tipoEvento: "formacao",
        formacaoId: e.formacaoId,
        formacaoTema: e.tema,
        nivelFormativo: NIVEL,
        tipoFormacao: e.tipoFormacao,
        formadorId: FORMADOR,
        formadorNome: "Carlos Mendes",
        grupoFormacaoId: TURMA_ID,
        dataInicio: e.inicio,
        dataFim: new Date(e.inicio.getTime() + 3 * 60 * 60 * 1000),
        local: "Casa de Retiros N. Sra. — Salão São Miguel",
        status: e.inicio < new Date() ? "realizada" : "agendada",
      },
    });

    await prisma.presencaFormacao.upsert({
      where: { agendamentoId_formandoId: { agendamentoId: e.id, formandoId: FORMANDO_ID } },
      update: { presente: e.presente, confirmacaoFormando: e.conf },
      create: {
        organizacaoId: ORG,
        agendamentoId: e.id,
        formacaoTema: e.tema,
        data: e.inicio,
        formandoId: FORMANDO_ID,
        formandoNome: NOME,
        nivelFormativo: NIVEL,
        presente: e.presente,
        confirmacaoFormando: e.conf,
      },
    });
  }

  // 6. Link de ATIVAÇÃO (1º acesso) — define a senha e abre o dashboard.
  const raw = randomBytes(32).toString("hex");
  await prisma.formandoAccessToken.create({
    data: {
      formandoId: FORMANDO_ID,
      tokenHash: createHash("sha256").update(raw).digest("hex"),
      tipo: "ativacao",
      expiresAt: dias(7),
    },
  });

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  console.log("\n✅ Seed do Portal do Vocacionado (caminho feliz completo) concluído.");
  console.log("Vocacionado:", NOME, "<" + EMAIL + ">", "| turma São Miguel | participação ATIVA");
  console.log("Presença: 3/3 encontros passados (100%) · Materiais: 3 formações (1 com anexo PDF)");
  console.log("Anexo:", ANEXO_NOME, `(${R2_ENABLED ? "R2" : "disco local"})`);
  console.log("\n🔗 LINK DE ATIVAÇÃO (defina uma senha e entre no dashboard):");
  console.log(`${base}/portal/ativar/${raw}`);
  console.log("\n(Depois, login normal em " + base + "/portal/vocacional com o e-mail acima.)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
