-- AlterEnum
-- Novo tipo voltado ao FORMANDO (histórico in-app no Portal).
ALTER TYPE "TipoNotificacao" ADD VALUE 'aviso_comunidade';

-- AlterTable
-- Destinatário polimórfico: destinatarioId (Usuario) passa a ser nullable e
-- entra formandoId (Formando). A regra "exatamente um" é imposta em código.
ALTER TABLE "Notificacao" ALTER COLUMN "destinatarioId" DROP NOT NULL,
ADD COLUMN "formandoId" TEXT;

-- CreateIndex
CREATE INDEX "Notificacao_formandoId_lida_idx" ON "Notificacao"("formandoId", "lida");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;
