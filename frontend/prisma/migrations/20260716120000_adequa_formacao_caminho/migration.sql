-- Adequação da seção Formações ao Caminho Formativo (G1–G7)
-- G1: remove formador do cadastro (formadorId/formadorNome)
-- G2/G7: planoId como FK; remove nomes denormalizados (eixoNome/gradeNome/etapa*)
-- G4: origem prevista|complementar + governança (origemPor/origemEm)
-- G5: governança da formação pontual (codigo/responsavel/data/contexto/status)
-- G6: remove vezesUtilizada (contador morto; realização derivada de Agendamento)
--
-- Ordem importa: as colunas antigas (eixoNome) são usadas para RECUPERAR o
-- vínculo de eixo ANTES de serem dropadas, e os órfãos são resolvidos ANTES de
-- criar as foreign keys — senão a criação das FKs falha (dado legado com
-- eixoId apontando para Eixo inexistente, do fluxo anterior ao eixoPlanoId).

-- 1. Adiciona as colunas novas (mantém as antigas por ora — necessárias abaixo).
ALTER TABLE "Formacao"
  ADD COLUMN "codigo" TEXT,
  ADD COLUMN "contextoRealizacao" TEXT,
  ADD COLUMN "dataRealizacao" TIMESTAMP(3),
  ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'prevista',
  ADD COLUMN "origemEm" TIMESTAMP(3),
  ADD COLUMN "origemPor" TEXT,
  ADD COLUMN "planoId" TEXT,
  ADD COLUMN "responsavelInstitucional" TEXT,
  ADD COLUMN "statusRealizacao" TEXT NOT NULL DEFAULT 'registrada';

-- 2. Backfill de planoId a partir da grade vinculada (FK como fonte de verdade).
UPDATE "Formacao" f
SET "planoId" = g."planoId"
FROM "GradeFormativa" g
WHERE f."gradeId" = g."id" AND f."planoId" IS NULL;

-- 3. Recupera eixoId órfão casando o eixoNome denormalizado ao Eixo atual da
--    MESMA grade (legado: os ids de Eixo mudavam a cada save antes do fix).
UPDATE "Formacao" f
SET "eixoId" = e."id"
FROM "Eixo" e
WHERE f."gradeId" IS NOT NULL
  AND e."gradeId" = f."gradeId"
  AND e."nome" = f."eixoNome"
  AND (f."eixoId" IS NULL OR NOT EXISTS (SELECT 1 FROM "Eixo" x WHERE x."id" = f."eixoId"));

-- 4. Zera referências que ainda não resolvem, para as FKs poderem ser criadas.
UPDATE "Formacao" SET "eixoId" = NULL
WHERE "eixoId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Eixo" e WHERE e."id" = "eixoId");
UPDATE "Formacao" SET "gradeId" = NULL
WHERE "gradeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "GradeFormativa" g WHERE g."id" = "gradeId");
UPDATE "Formacao" SET "planoId" = NULL
WHERE "planoId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "PlanoFormativo" p WHERE p."id" = "planoId");

-- 5. Remove formador (G1), nomes denormalizados/mortos (G7) e vezesUtilizada (G6).
ALTER TABLE "Formacao" DROP CONSTRAINT "Formacao_formadorId_fkey";
ALTER TABLE "Formacao"
  DROP COLUMN "eixoNome",
  DROP COLUMN "etapaId",
  DROP COLUMN "etapaNome",
  DROP COLUMN "formadorId",
  DROP COLUMN "formadorNome",
  DROP COLUMN "gradeNome",
  DROP COLUMN "vezesUtilizada";

-- 6. Índices das novas FKs.
CREATE INDEX "Formacao_planoId_idx" ON "Formacao"("planoId");
CREATE INDEX "Formacao_gradeId_idx" ON "Formacao"("gradeId");
CREATE INDEX "Formacao_eixoId_idx" ON "Formacao"("eixoId");

-- 7. Foreign keys do caminho formativo.
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeFormativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_eixoId_fkey" FOREIGN KEY ("eixoId") REFERENCES "Eixo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
