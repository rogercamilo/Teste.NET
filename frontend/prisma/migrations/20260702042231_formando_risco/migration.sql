-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'formando_em_risco';

-- AlterTable
ALTER TABLE "Formando" ADD COLUMN     "riscoAlertadoEm" TIMESTAMP(3);
