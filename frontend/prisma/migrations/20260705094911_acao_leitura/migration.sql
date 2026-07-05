-- CreateEnum
CREATE TYPE "TipoAcaoLeitura" AS ENUM ('leitura', 'partilha', 'evangelizacao_instagram', 'evangelizacao_youtube');

-- CreateTable
CREATE TABLE "AcaoLeitura" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "leituraId" TEXT NOT NULL,
    "capituloId" TEXT,
    "tipo" "TipoAcaoLeitura" NOT NULL DEFAULT 'leitura',
    "frutos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcaoLeitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcaoLeitura_organizacaoId_idx" ON "AcaoLeitura"("organizacaoId");

-- CreateIndex
CREATE INDEX "AcaoLeitura_leituraId_idx" ON "AcaoLeitura"("leituraId");

-- CreateIndex
CREATE INDEX "AcaoLeitura_formandoId_leituraId_idx" ON "AcaoLeitura"("formandoId", "leituraId");

-- CreateIndex
CREATE UNIQUE INDEX "AcaoLeitura_formandoId_capituloId_key" ON "AcaoLeitura"("formandoId", "capituloId");

-- AddForeignKey
ALTER TABLE "AcaoLeitura" ADD CONSTRAINT "AcaoLeitura_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoLeitura" ADD CONSTRAINT "AcaoLeitura_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoLeitura" ADD CONSTRAINT "AcaoLeitura_leituraId_fkey" FOREIGN KEY ("leituraId") REFERENCES "LeituraVocacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoLeitura" ADD CONSTRAINT "AcaoLeitura_capituloId_fkey" FOREIGN KEY ("capituloId") REFERENCES "CapituloLeitura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
