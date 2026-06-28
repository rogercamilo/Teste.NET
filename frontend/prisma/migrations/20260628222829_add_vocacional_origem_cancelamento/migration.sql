-- AlterEnum
ALTER TYPE "StatusParticipacaoVocacional" ADD VALUE 'cancelada';

-- AlterTable
ALTER TABLE "ParticipacaoVocacional" ADD COLUMN     "condicaoOrigem" "CondicaoMembro",
ADD COLUMN     "grupoOrigemId" TEXT,
ADD COLUMN     "termoIngressoId" TEXT;
