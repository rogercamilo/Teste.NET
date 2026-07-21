-- Revisão editorial de conteúdo (Formador Pedagógico): nulo = ainda não revisada.
-- Colunas aditivas e nullable — sem backfill, sem risco para dados existentes.
ALTER TABLE "GradeFormativa" ADD COLUMN "revisadoEm" TIMESTAMP(3);
ALTER TABLE "GradeFormativa" ADD COLUMN "revisadoPor" TEXT;

ALTER TABLE "Formacao" ADD COLUMN "revisadoEm" TIMESTAMP(3);
ALTER TABLE "Formacao" ADD COLUMN "revisadoPor" TEXT;
