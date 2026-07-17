/**
 * Seed de teste para o Portal do Formando (uso local apenas).
 * Cria um formando com e-mail + grupo + progresso + agendamentos + presenças,
 * anexa um PDF real à formação (para exercitar o download de material no portal)
 * e imprime um LINK DE ATIVAÇÃO pronto para definir a senha e abrir o dashboard.
 *
 * Run:
 *   npx tsx scripts/seed-portal-test.ts
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { randomBytes, createHash } from "node:crypto";

// Carrega env do .env.local (Prisma/tsx não leem sozinhos). Inclui as vars do R2
// para que o anexo suba no MESMO storage que o app usa em dev.
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(
    /^(DATABASE_URL|AUTH_SECRET|NEXTAUTH_URL|R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME)=(.*)$/
  );
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG = "org_default";
const GRUPO = "cmqhc3lup000v0pb4xhqebyeq"; // morada "São João"
const FORMADOR = "u2"; // Carlos Mendes (formador_comunitario)
const NIVEL = "discipulado";
const EMAIL = "portal.teste@formattio.dev";
const FORMANDO_ID = "fmd_portal_test";
const NOME = "Maria Testadora";
const FORMACAO_ID = "fmc_portal_test";
const ARQUIVO_ID = "arq_portal_test";
const ANEXO_NOME = "Material de apoio — Discipulado.pdf";
// Key determinística: re-execuções sobrescrevem o mesmo objeto (sem órfãos).
const STORAGE_KEY = `org_${ORG}/formacao/portal-test-material.pdf`;

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

async function main() {
  // 1. Formando
  await prisma.formando.upsert({
    where: { id: FORMANDO_ID },
    update: { email: EMAIL, ativo: true, deletedAt: null, grupoFormacaoId: GRUPO, nivelFormativo: NIVEL },
    create: {
      id: FORMANDO_ID,
      organizacaoId: ORG,
      nome: NOME,
      dataNascimento: new Date("1995-03-10"),
      estadoCivil: "solteiro",
      modalidade: "presencial",
      nivelFormativo: NIVEL,
      dataIngresso: dias(-400),
      telefone: "(11) 90000-0000",
      email: EMAIL,
      grupoFormacaoId: GRUPO,
    },
  });

  // 2. Progresso da etapa
  await prisma.progressoEtapa.upsert({
    where: { formandoId_nivelFormativo: { formandoId: FORMANDO_ID, nivelFormativo: NIVEL } },
    update: { formacoesComunitariasRealizadas: 8, retirosComunitariosRealizados: 1, retirosPessoaisRealizados: 2 },
    create: {
      formandoId: FORMANDO_ID,
      nivelFormativo: NIVEL,
      formacoesComunitariasRealizadas: 8,
      retirosComunitariosRealizados: 1,
      retirosPessoaisRealizados: 2,
      iniciouEm: dias(-200),
    },
  });

  // 3. Formacao (template para os agendamentos) — com material de apoio em texto
  await prisma.formacao.upsert({
    where: { id: FORMACAO_ID },
    update: {
      materialApoio:
        "Leitura recomendada: Evangelho de João, cap. 15.\nLink de apoio: https://exemplo.org/vida-comunitaria",
    },
    create: {
      id: FORMACAO_ID,
      organizacaoId: ORG,
      tema: "Encontro de Discipulado",
      objetivo: "Aprofundamento na vida comunitária",
      descricao: "Formação de teste para o portal.",
      materialApoio:
        "Leitura recomendada: Evangelho de João, cap. 15.\nLink de apoio: https://exemplo.org/vida-comunitaria",
      nivelFormativo: NIVEL,
      tipoFormacao: "comunitaria",
      cargaHoraria: 2,
      modalidade: "presencial",
    },
  });

  // 3b. Anexo real (PDF) ligado à formação — exercita o download de material.
  const pdf = buildMinimalPdf([
    "Material de apoio — Encontro de Discipulado",
    "",
    "Formattio · Portal do Formando (seed de teste)",
    "Aprofundamento na vida comunitaria.",
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
      entityId: FORMACAO_ID,
    },
  });
  await prisma.formacao.update({
    where: { id: FORMACAO_ID },
    data: { documentoAnexo: ANEXO_NOME, documentoAnexoId: ARQUIVO_ID },
  });

  // 4. Agendamentos + presenças
  const encontros = [
    { id: "agd_portal_past1", tema: "A Oração na Comunidade", tipo: "comunitaria", inicio: dias(-14), presente: true, conf: null as boolean | null },
    { id: "agd_portal_past2", tema: "Escuta da Palavra", tipo: "comunitaria", inicio: dias(-7), presente: false, conf: null as boolean | null },
    { id: "agd_portal_past3", tema: "Retiro de Advento", tipo: "retiro-comunitario", inicio: dias(-4), presente: true, conf: null as boolean | null },
    { id: "agd_portal_future", tema: "Vida Fraterna", tipo: "comunitaria", inicio: dias(3), presente: false, conf: null as boolean | null },
  ];

  for (const e of encontros) {
    await prisma.agendamento.upsert({
      where: { id: e.id },
      update: { dataInicio: e.inicio, dataFim: new Date(e.inicio.getTime() + 2 * 60 * 60 * 1000) },
      create: {
        id: e.id,
        organizacaoId: ORG,
        formacaoId: FORMACAO_ID,
        formacaoTema: e.tema,
        nivelFormativo: NIVEL,
        tipoFormacao: e.tipo,
        formadorId: FORMADOR,
        formadorNome: "Carlos Mendes",
        grupoFormacaoId: GRUPO,
        dataInicio: e.inicio,
        dataFim: new Date(e.inicio.getTime() + 2 * 60 * 60 * 1000),
        local: "Salão Paroquial",
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

  // 5. Link de ATIVAÇÃO (1º acesso). O portal migrou para senha — o magic link
  // instantâneo não existe mais. Gera um token de ativação (hash sha256 no banco)
  // e imprime a URL da tela que define a senha e abre o dashboard.
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
  console.log("\n✅ Seed concluído.");
  console.log("Formando:", NOME, "<" + EMAIL + ">", "| grupo São João | nível discipulado");
  console.log("Anexo:", ANEXO_NOME, `(${R2_ENABLED ? "R2" : "disco local"})`);
  console.log("\n🔗 LINK DE ATIVAÇÃO (defina uma senha e entre no dashboard):");
  console.log(`${base}/portal/ativar/${raw}`);
  console.log("\n(Depois, login normal em " + base + "/portal/formando com o e-mail acima.)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
