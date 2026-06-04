-- CreateTable
CREATE TABLE "RelatorioEtapa" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "avaliacaoHumana" TEXT,
    "avaliacaoEspiritual" TEXT,
    "avaliacaoComunitaria" TEXT,
    "textoNarrativo" TEXT,
    "pontosForteza" TEXT,
    "desafios" TEXT,
    "recomendacao" TEXT,
    "textoRecomendacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatorioEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelatorioEtapa_organizacaoId_idx" ON "RelatorioEtapa"("organizacaoId");

-- CreateIndex
CREATE INDEX "RelatorioEtapa_formandoId_idx" ON "RelatorioEtapa"("formandoId");

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioEtapa_formandoId_nivelFormativo_key" ON "RelatorioEtapa"("formandoId", "nivelFormativo");

-- AddForeignKey
ALTER TABLE "RelatorioEtapa" ADD CONSTRAINT "RelatorioEtapa_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioEtapa" ADD CONSTRAINT "RelatorioEtapa_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioEtapa" ADD CONSTRAINT "RelatorioEtapa_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
