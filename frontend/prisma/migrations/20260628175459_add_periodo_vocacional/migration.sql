-- CreateEnum
CREATE TYPE "StatusParticipacaoVocacional" AS ENUM ('ativa', 'aguardando_carta', 'em_discernimento', 'concluida_deferida', 'recusada_arquivada', 'indeferida_arquivada');

-- CreateEnum
CREATE TYPE "DesfechoCartaVocacional" AS ENUM ('pedido', 'recusa');

-- CreateEnum
CREATE TYPE "TipoEncontroAcompanhamento" AS ENUM ('mensal', 'extra');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoAcompanhamento" AS ENUM ('pendente', 'agendada', 'recusada');

-- AlterEnum
ALTER TYPE "TipoGrupoFormacao" ADD VALUE 'vocacional';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoTermoRegistro" ADD VALUE 'ingresso_vocacional';
ALTER TYPE "TipoTermoRegistro" ADD VALUE 'termino_vocacional';

-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "termoAcompanhamentoVocacional" TEXT NOT NULL DEFAULT 'Acompanhamento Vocacional',
ADD COLUMN     "termoVocacional" TEXT NOT NULL DEFAULT 'Período Vocacional',
ADD COLUMN     "vocacionalDuracaoPadraoMeses" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "vocacionalHabilitado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "morada" ADD COLUMN     "vocacionalAcompanhamentoAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vocacionalDuracaoMeses" INTEGER,
ADD COLUMN     "vocacionalTotalRetiros" INTEGER;

-- CreateTable
CREATE TABLE "ParticipacaoVocacional" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "status" "StatusParticipacaoVocacional" NOT NULL DEFAULT 'ativa',
    "dataIngresso" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "desfechoCarta" "DesfechoCartaVocacional",
    "cartaArquivoId" TEXT,
    "cartaRecebidaEm" TIMESTAMP(3),
    "processoGeradoId" TEXT,
    "acompanhadorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipacaoVocacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcompanhamentoVocacional" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "participacaoId" TEXT NOT NULL,
    "acompanhadorId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEncontroAcompanhamento" NOT NULL DEFAULT 'mensal',
    "solicitadoPeloVocacionado" BOOLEAN NOT NULL DEFAULT false,
    "anotacaoEvolucao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcompanhamentoVocacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoAcompanhamento" (
    "id" TEXT NOT NULL,
    "participacaoId" TEXT NOT NULL,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagem" TEXT,
    "status" "StatusSolicitacaoAcompanhamento" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "SolicitacaoAcompanhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipacaoVocacional_organizacaoId_idx" ON "ParticipacaoVocacional"("organizacaoId");

-- CreateIndex
CREATE INDEX "ParticipacaoVocacional_turmaId_idx" ON "ParticipacaoVocacional"("turmaId");

-- CreateIndex
CREATE INDEX "ParticipacaoVocacional_organizacaoId_status_idx" ON "ParticipacaoVocacional"("organizacaoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipacaoVocacional_formandoId_turmaId_key" ON "ParticipacaoVocacional"("formandoId", "turmaId");

-- CreateIndex
CREATE INDEX "AcompanhamentoVocacional_organizacaoId_idx" ON "AcompanhamentoVocacional"("organizacaoId");

-- CreateIndex
CREATE INDEX "AcompanhamentoVocacional_participacaoId_idx" ON "AcompanhamentoVocacional"("participacaoId");

-- CreateIndex
CREATE INDEX "SolicitacaoAcompanhamento_participacaoId_idx" ON "SolicitacaoAcompanhamento"("participacaoId");

-- CreateIndex
CREATE INDEX "SolicitacaoAcompanhamento_status_idx" ON "SolicitacaoAcompanhamento"("status");

-- AddForeignKey
ALTER TABLE "ParticipacaoVocacional" ADD CONSTRAINT "ParticipacaoVocacional_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacaoVocacional" ADD CONSTRAINT "ParticipacaoVocacional_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacaoVocacional" ADD CONSTRAINT "ParticipacaoVocacional_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "morada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacaoVocacional" ADD CONSTRAINT "ParticipacaoVocacional_acompanhadorId_fkey" FOREIGN KEY ("acompanhadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcompanhamentoVocacional" ADD CONSTRAINT "AcompanhamentoVocacional_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcompanhamentoVocacional" ADD CONSTRAINT "AcompanhamentoVocacional_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "ParticipacaoVocacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcompanhamentoVocacional" ADD CONSTRAINT "AcompanhamentoVocacional_acompanhadorId_fkey" FOREIGN KEY ("acompanhadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAcompanhamento" ADD CONSTRAINT "SolicitacaoAcompanhamento_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "ParticipacaoVocacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
