-- DropIndex
DROP INDEX "AcaoLeitura_formandoId_capituloId_key";

-- AlterTable
ALTER TABLE "AcaoLeitura" ADD COLUMN     "formadorCurtiu" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formadorNota" TEXT,
ADD COLUMN     "formadorReagiuEm" TIMESTAMP(3),
ADD COLUMN     "formadorReagiuId" TEXT,
ADD COLUMN     "texto" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AcaoLeitura_formandoId_capituloId_tipo_key" ON "AcaoLeitura"("formandoId", "capituloId", "tipo");
