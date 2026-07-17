-- Adequação da seção Formações ao Caminho Formativo (G1–G7)
-- G1: remove formador do cadastro (formadorId/formadorNome)
-- G2/G7: planoId como FK; remove nomes denormalizados (eixoNome/gradeNome/etapa*)
-- G4: origem prevista|complementar + governança (origemPor/origemEm)
-- G5: governança da formação pontual (codigo/responsavel/data/contexto/status)
-- G6: remove vezesUtilizada (contador morto; realização derivada de Agendamento)

-- DropForeignKey
ALTER TABLE "Formacao" DROP CONSTRAINT "Formacao_formadorId_fkey";

-- AlterTable
ALTER TABLE "Formacao" DROP COLUMN "eixoNome",
DROP COLUMN "etapaId",
DROP COLUMN "etapaNome",
DROP COLUMN "formadorId",
DROP COLUMN "formadorNome",
DROP COLUMN "gradeNome",
DROP COLUMN "vezesUtilizada",
ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "contextoRealizacao" TEXT,
ADD COLUMN     "dataRealizacao" TIMESTAMP(3),
ADD COLUMN     "origem" TEXT NOT NULL DEFAULT 'prevista',
ADD COLUMN     "origemEm" TIMESTAMP(3),
ADD COLUMN     "origemPor" TEXT,
ADD COLUMN     "planoId" TEXT,
ADD COLUMN     "responsavelInstitucional" TEXT,
ADD COLUMN     "statusRealizacao" TEXT NOT NULL DEFAULT 'registrada';

-- Backfill: deriva planoId da grade vinculada (FK como fonte de verdade)
UPDATE "Formacao" f
SET "planoId" = g."planoId"
FROM "GradeFormativa" g
WHERE f."gradeId" = g."id" AND f."planoId" IS NULL;

-- CreateIndex
CREATE INDEX "Formacao_planoId_idx" ON "Formacao"("planoId");

-- CreateIndex
CREATE INDEX "Formacao_gradeId_idx" ON "Formacao"("gradeId");

-- CreateIndex
CREATE INDEX "Formacao_eixoId_idx" ON "Formacao"("eixoId");

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeFormativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_eixoId_fkey" FOREIGN KEY ("eixoId") REFERENCES "Eixo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
