-- CreateEnum
CREATE TYPE "StatusTomo" AS ENUM ('aberto', 'encerrado');

-- CreateEnum
CREATE TYPE "CondicaoMembro" AS ENUM ('candidato', 'membro_em_experiencia', 'membro_em_formacao', 'membro_primeiras_promessas', 'membro_consagrado', 'membro_definitivas', 'desligado', 'falecido');

-- CreateEnum
CREATE TYPE "TipoTermoRegistro" AS ENUM ('admissao_etapa', 'conclusao_etapa', 'primeiras_promessas', 'renovacao_promessas', 'promessas_definitivas', 'ministerio', 'missao', 'transferencia', 'licenca_inicio', 'licenca_termino', 'desligamento', 'dispensa', 'falecimento', 'retificacao');

-- AlterTable
ALTER TABLE "Formando" ADD COLUMN     "condicaoAtual" "CondicaoMembro";

-- CreateTable
CREATE TABLE "LivroRegistroTomo" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "totalFolhas" INTEGER NOT NULL DEFAULT 200,
    "status" "StatusTomo" NOT NULL DEFAULT 'aberto',
    "aberturaData" TIMESTAMP(3) NOT NULL,
    "aberturaModerador" TEXT NOT NULL,
    "aberturaSecretario" TEXT NOT NULL,
    "aberturaTexto" TEXT NOT NULL,
    "aberturaArquivoId" TEXT,
    "encerramentoData" TIMESTAMP(3),
    "encerramentoTexto" TEXT,
    "encerramentoArquivoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivroRegistroTomo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermoRegistro" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "tomoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" "TipoTermoRegistro" NOT NULL,
    "formandoId" TEXT,
    "dataEvento" TIMESTAMP(3) NOT NULL,
    "dataLavratura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "corpoTexto" TEXT NOT NULL,
    "condicaoResultante" "CondicaoMembro",
    "processoId" TEXT,
    "registroPromessaId" TEXT,
    "arquivoRefId" TEXT,
    "retificaTermoId" TEXT,
    "lavradoAutomaticamente" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermoRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LivroRegistroTomo_organizacaoId_status_idx" ON "LivroRegistroTomo"("organizacaoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LivroRegistroTomo_organizacaoId_numero_key" ON "LivroRegistroTomo"("organizacaoId", "numero");

-- CreateIndex
CREATE INDEX "TermoRegistro_organizacaoId_idx" ON "TermoRegistro"("organizacaoId");

-- CreateIndex
CREATE INDEX "TermoRegistro_formandoId_idx" ON "TermoRegistro"("formandoId");

-- CreateIndex
CREATE INDEX "TermoRegistro_tomoId_idx" ON "TermoRegistro"("tomoId");

-- CreateIndex
CREATE UNIQUE INDEX "TermoRegistro_tomoId_numero_key" ON "TermoRegistro"("tomoId", "numero");

-- AddForeignKey
ALTER TABLE "LivroRegistroTomo" ADD CONSTRAINT "LivroRegistroTomo_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermoRegistro" ADD CONSTRAINT "TermoRegistro_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermoRegistro" ADD CONSTRAINT "TermoRegistro_tomoId_fkey" FOREIGN KEY ("tomoId") REFERENCES "LivroRegistroTomo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermoRegistro" ADD CONSTRAINT "TermoRegistro_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE SET NULL ON UPDATE CASCADE;
