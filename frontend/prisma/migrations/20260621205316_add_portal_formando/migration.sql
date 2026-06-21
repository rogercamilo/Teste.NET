-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'justificativa_formando';

-- AlterTable
ALTER TABLE "PresencaFormacao" ADD COLUMN     "confirmacaoFormando" BOOLEAN,
ADD COLUMN     "justificativaFormando" TEXT;
