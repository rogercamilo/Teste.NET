/*
  Warnings:

  - You are about to drop the column `endereco` on the `Morada` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CookieConsent" ADD COLUMN     "ip" TEXT;

-- AlterTable
ALTER TABLE "Formacao" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Formando" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Morada" DROP COLUMN "endereco",
ADD COLUMN     "localReuniao" TEXT;

-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "cortesia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cortesiaExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cortesiaMotivo" TEXT,
ADD COLUMN     "termoDiscipulado" TEXT NOT NULL DEFAULT 'Discipulado',
ADD COLUMN     "termoFormacaoPermanente" TEXT NOT NULL DEFAULT 'Formação Permanente',
ADD COLUMN     "termoPreDiscipulado" TEXT NOT NULL DEFAULT 'Pré-Discipulado',
ADD COLUMN     "termoPrimeirasPromessas" TEXT NOT NULL DEFAULT 'Primeiras Promessas';

-- AlterTable
ALTER TABLE "PrivacyAcceptance" ADD COLUMN     "ip" TEXT;

-- CreateIndex
CREATE INDEX "Agendamento_status_idx" ON "Agendamento"("status");

-- CreateIndex
CREATE INDEX "Agendamento_organizacaoId_status_dataInicio_idx" ON "Agendamento"("organizacaoId", "status", "dataInicio");

-- CreateIndex
CREATE INDEX "Agendamento_deletedAt_idx" ON "Agendamento"("deletedAt");

-- CreateIndex
CREATE INDEX "Arquivo_uploadedById_idx" ON "Arquivo"("uploadedById");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_criadoEm_idx" ON "AuditLog"("usuarioId", "criadoEm");

-- CreateIndex
CREATE INDEX "ConviteUsuario_email_idx" ON "ConviteUsuario"("email");

-- CreateIndex
CREATE INDEX "ConviteUsuario_expiresAt_idx" ON "ConviteUsuario"("expiresAt");

-- CreateIndex
CREATE INDEX "DeletionRequest_status_idx" ON "DeletionRequest"("status");

-- CreateIndex
CREATE INDEX "Formacao_deletedAt_idx" ON "Formacao"("deletedAt");

-- CreateIndex
CREATE INDEX "Formando_organizacaoId_ativo_idx" ON "Formando"("organizacaoId", "ativo");

-- CreateIndex
CREATE INDEX "Formando_deletedAt_idx" ON "Formando"("deletedAt");

-- CreateIndex
CREATE INDEX "Organizacao_status_idx" ON "Organizacao"("status");

-- CreateIndex
CREATE INDEX "Organizacao_planoAssinatura_idx" ON "Organizacao"("planoAssinatura");

-- CreateIndex
CREATE INDEX "PrivacyAcceptance_tipo_idx" ON "PrivacyAcceptance"("tipo");
