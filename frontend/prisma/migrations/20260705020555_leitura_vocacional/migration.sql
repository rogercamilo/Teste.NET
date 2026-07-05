-- CreateTable
CREATE TABLE "LeituraVocacional" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "morada_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeituraVocacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapituloLeitura" (
    "id" TEXT NOT NULL,
    "leituraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,

    CONSTRAINT "CapituloLeitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeituraVocacional_organizacaoId_idx" ON "LeituraVocacional"("organizacaoId");

-- CreateIndex
CREATE INDEX "LeituraVocacional_morada_id_ordem_idx" ON "LeituraVocacional"("morada_id", "ordem");

-- CreateIndex
CREATE INDEX "CapituloLeitura_leituraId_idx" ON "CapituloLeitura"("leituraId");

-- CreateIndex
CREATE UNIQUE INDEX "CapituloLeitura_leituraId_numero_key" ON "CapituloLeitura"("leituraId", "numero");

-- AddForeignKey
ALTER TABLE "LeituraVocacional" ADD CONSTRAINT "LeituraVocacional_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraVocacional" ADD CONSTRAINT "LeituraVocacional_morada_id_fkey" FOREIGN KEY ("morada_id") REFERENCES "morada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapituloLeitura" ADD CONSTRAINT "CapituloLeitura_leituraId_fkey" FOREIGN KEY ("leituraId") REFERENCES "LeituraVocacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
