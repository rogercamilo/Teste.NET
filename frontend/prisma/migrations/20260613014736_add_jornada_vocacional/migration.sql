-- CreateEnum
CREATE TYPE "TipoProcessoEclesiastico" AS ENUM ('admissao_etapa1', 'admissao_etapa2', 'promessas_iniciais', 'renovacao_promessas', 'promessas_definitivas', 'ministerio', 'missao', 'licenca', 'transferencia', 'desligamento', 'falecimento');

-- CreateEnum
CREATE TYPE "StatusProcessoEclesiastico" AS ENUM ('rascunho', 'em_andamento', 'em_revisao', 'aprovado', 'rejeitado', 'concluido', 'arquivado', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoDocumentoEclesiastico" AS ENUM ('ato_admissao', 'informacoes_pastorais', 'declaracao_responsavel', 'ciencia_politicas_internas', 'termo_cerimonial', 'termo_consagracao', 'requerimento_renovacao', 'parecer_formativo', 'ato_admissao_renovacao', 'termo_renovacao', 'carta_missao', 'carta_transferencia', 'carta_licenca', 'termo_desligamento', 'dispensa_promessas');

-- CreateEnum
CREATE TYPE "StatusDocumentoEclesiastico" AS ENUM ('pendente', 'gerado', 'assinado', 'arquivado', 'substituido');

-- CreateEnum
CREATE TYPE "TipoRegistroPromessa" AS ENUM ('iniciais_temporarias', 'renovacao', 'definitivas', 'dispensa');

-- AlterTable
ALTER TABLE "Formando" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "nacionalidade" TEXT,
ADD COLUMN     "nomeSocial" TEXT,
ADD COLUMN     "numFilhos" INTEGER,
ADD COLUMN     "orgaoEmissor" TEXT,
ADD COLUMN     "paroquiaReferencia" TEXT,
ADD COLUMN     "rg" TEXT;

-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "termoPromessa" TEXT NOT NULL DEFAULT 'Promessa';

-- AlterTable
ALTER TABLE "morada" RENAME CONSTRAINT "Morada_pkey" TO "morada_pkey";

-- CreateTable
CREATE TABLE "ProcessoEclesiastico" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "tipo" "TipoProcessoEclesiastico" NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "status" "StatusProcessoEclesiastico" NOT NULL DEFAULT 'rascunho',
    "dadosFormulario" JSONB NOT NULL DEFAULT '{}',
    "favoravelRenovacao" BOOLEAN,
    "numeroRenovacao" INTEGER,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoEclesiastico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoEclesiastico" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" "TipoDocumentoEclesiastico" NOT NULL,
    "status" "StatusDocumentoEclesiastico" NOT NULL DEFAULT 'pendente',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "arquivoId" TEXT,
    "substituiDocumentoId" TEXT,
    "geradoEm" TIMESTAMP(3),
    "geradoPorId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoEclesiastico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroPromessa" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" "TipoRegistroPromessa" NOT NULL,
    "numeroRegistro" TEXT NOT NULL,
    "tomo" TEXT NOT NULL,
    "folha" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "dataVigenciaInicio" TIMESTAMP(3) NOT NULL,
    "dataVigenciaFim" TIMESTAMP(3),
    "formulaTexto" TEXT NOT NULL,
    "celebrante" TEXT NOT NULL,
    "localCelebracao" TEXT NOT NULL,
    "moderadorGeral" TEXT NOT NULL,
    "formadorGeralLocal" TEXT,
    "assistenteEclesiastico" TEXT,
    "secretario" TEXT NOT NULL,
    "dataDispensa" TIMESTAMP(3),
    "autoridadeDispensa" TEXT,
    "arquivoTermoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroPromessa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessoEclesiastico_organizacaoId_idx" ON "ProcessoEclesiastico"("organizacaoId");

-- CreateIndex
CREATE INDEX "ProcessoEclesiastico_formandoId_idx" ON "ProcessoEclesiastico"("formandoId");

-- CreateIndex
CREATE INDEX "ProcessoEclesiastico_status_idx" ON "ProcessoEclesiastico"("status");

-- CreateIndex
CREATE INDEX "ProcessoEclesiastico_organizacaoId_status_idx" ON "ProcessoEclesiastico"("organizacaoId", "status");

-- CreateIndex
CREATE INDEX "ProcessoEclesiastico_organizacaoId_tipo_idx" ON "ProcessoEclesiastico"("organizacaoId", "tipo");

-- CreateIndex
CREATE INDEX "DocumentoEclesiastico_processoId_idx" ON "DocumentoEclesiastico"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoEclesiastico_arquivoId_idx" ON "DocumentoEclesiastico"("arquivoId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroPromessa_processoId_key" ON "RegistroPromessa"("processoId");

-- CreateIndex
CREATE INDEX "RegistroPromessa_organizacaoId_idx" ON "RegistroPromessa"("organizacaoId");

-- CreateIndex
CREATE INDEX "RegistroPromessa_formandoId_idx" ON "RegistroPromessa"("formandoId");

-- RenameForeignKey
ALTER TABLE "Agendamento" RENAME CONSTRAINT "Agendamento_moradaId_fkey" TO "Agendamento_morada_id_fkey";

-- RenameForeignKey
ALTER TABLE "Formando" RENAME CONSTRAINT "Formando_moradaId_fkey" TO "Formando_morada_id_fkey";

-- RenameForeignKey
ALTER TABLE "Usuario" RENAME CONSTRAINT "Usuario_moradaId_fkey" TO "Usuario_morada_id_fkey";

-- RenameForeignKey
ALTER TABLE "morada" RENAME CONSTRAINT "Morada_formadorId_fkey" TO "morada_formadorId_fkey";

-- RenameForeignKey
ALTER TABLE "morada" RENAME CONSTRAINT "Morada_gradeId_fkey" TO "morada_gradeId_fkey";

-- RenameForeignKey
ALTER TABLE "morada" RENAME CONSTRAINT "Morada_organizacaoId_fkey" TO "morada_organizacaoId_fkey";

-- RenameForeignKey
ALTER TABLE "morada" RENAME CONSTRAINT "Morada_planoId_fkey" TO "morada_planoId_fkey";

-- AddForeignKey
ALTER TABLE "ProcessoEclesiastico" ADD CONSTRAINT "ProcessoEclesiastico_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEclesiastico" ADD CONSTRAINT "ProcessoEclesiastico_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEclesiastico" ADD CONSTRAINT "ProcessoEclesiastico_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEclesiastico" ADD CONSTRAINT "DocumentoEclesiastico_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEclesiastico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEclesiastico" ADD CONSTRAINT "DocumentoEclesiastico_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEclesiastico" ADD CONSTRAINT "DocumentoEclesiastico_geradoPorId_fkey" FOREIGN KEY ("geradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPromessa" ADD CONSTRAINT "RegistroPromessa_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPromessa" ADD CONSTRAINT "RegistroPromessa_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPromessa" ADD CONSTRAINT "RegistroPromessa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEclesiastico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPromessa" ADD CONSTRAINT "RegistroPromessa_arquivoTermoId_fkey" FOREIGN KEY ("arquivoTermoId") REFERENCES "Arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Morada_formadorId_idx" RENAME TO "morada_formadorId_idx";

-- RenameIndex
ALTER INDEX "Morada_organizacaoId_idx" RENAME TO "morada_organizacaoId_idx";
