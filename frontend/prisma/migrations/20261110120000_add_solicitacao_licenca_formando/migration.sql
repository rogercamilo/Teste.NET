-- CreateEnum
CREATE TYPE "StatusSolicitacaoLicenca" AS ENUM ('pendente', 'atendida', 'recusada');

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'licenca_solicitada';

-- CreateTable
CREATE TABLE "SolicitacaoLicencaFormando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "status" "StatusSolicitacaoLicenca" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "SolicitacaoLicencaFormando_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoLicencaFormando_organizacaoId_idx" ON "SolicitacaoLicencaFormando"("organizacaoId");

-- CreateIndex
CREATE INDEX "SolicitacaoLicencaFormando_formandoId_idx" ON "SolicitacaoLicencaFormando"("formandoId");

-- CreateIndex
CREATE INDEX "SolicitacaoLicencaFormando_status_idx" ON "SolicitacaoLicencaFormando"("status");

-- AddForeignKey
ALTER TABLE "SolicitacaoLicencaFormando" ADD CONSTRAINT "SolicitacaoLicencaFormando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoLicencaFormando" ADD CONSTRAINT "SolicitacaoLicencaFormando_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;
