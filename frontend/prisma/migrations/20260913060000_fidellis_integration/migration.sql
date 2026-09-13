-- CreateTable
CREATE TABLE "IntegracaoFidellis" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "tenantSlug" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "serviceKeyEnc" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracaoFidellis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentimentoDizimo" (
    "id" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ip" TEXT,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "ConsentimentoDizimo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoFidellis_organizacaoId_key" ON "IntegracaoFidellis"("organizacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentimentoDizimo_formandoId_key" ON "ConsentimentoDizimo"("formandoId");

-- AddForeignKey
ALTER TABLE "IntegracaoFidellis" ADD CONSTRAINT "IntegracaoFidellis_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentimentoDizimo" ADD CONSTRAINT "ConsentimentoDizimo_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

