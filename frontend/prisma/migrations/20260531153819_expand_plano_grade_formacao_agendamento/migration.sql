-- DropIndex
DROP INDEX "ComentarioFormando_organizacaoId_idx";

-- DropIndex
DROP INDEX "EventoFormando_organizacaoId_idx";

-- DropIndex
DROP INDEX "PresencaFormacao_organizacaoId_idx";

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "moradaId" TEXT;

-- AlterTable
ALTER TABLE "Eixo" ADD COLUMN     "eixoPlanoId" TEXT;

-- AlterTable
ALTER TABLE "EixoPlano" ADD COLUMN     "nomeEtapa" TEXT,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Formacao" ADD COLUMN     "numero" INTEGER,
ADD COLUMN     "observacoesFormador" TEXT;

-- AlterTable
ALTER TABLE "Morada" ADD COLUMN     "imagemUrl" TEXT;

-- CreateTable
CREATE TABLE "RetiroPlano" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tema" TEXT NOT NULL,
    "trechoBiblico" TEXT,
    "objetivo" TEXT NOT NULL,
    "quandoRealizar" TEXT NOT NULL,
    "cargaHoraria" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RetiroPlano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetiroPlano_planoId_idx" ON "RetiroPlano"("planoId");

-- CreateIndex
CREATE INDEX "Agendamento_moradaId_idx" ON "Agendamento"("moradaId");

-- CreateIndex
CREATE INDEX "ComentarioFormando_organizacaoId_formandoId_idx" ON "ComentarioFormando"("organizacaoId", "formandoId");

-- CreateIndex
CREATE INDEX "Eixo_eixoPlanoId_idx" ON "Eixo"("eixoPlanoId");

-- CreateIndex
CREATE INDEX "EventoFormando_organizacaoId_formandoId_idx" ON "EventoFormando"("organizacaoId", "formandoId");

-- CreateIndex
CREATE INDEX "PresencaFormacao_organizacaoId_formandoId_idx" ON "PresencaFormacao"("organizacaoId", "formandoId");

-- AddForeignKey
ALTER TABLE "RetiroPlano" ADD CONSTRAINT "RetiroPlano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eixo" ADD CONSTRAINT "Eixo_eixoPlanoId_fkey" FOREIGN KEY ("eixoPlanoId") REFERENCES "EixoPlano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_moradaId_fkey" FOREIGN KEY ("moradaId") REFERENCES "Morada"("id") ON DELETE SET NULL ON UPDATE CASCADE;
