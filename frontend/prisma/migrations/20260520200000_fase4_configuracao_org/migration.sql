-- CreateTable
CREATE TABLE "ConfiguracaoOrg" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "smtpConfig" JSONB,
    "emailTemplate" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoOrg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoOrg_organizacaoId_key" ON "ConfiguracaoOrg"("organizacaoId");

-- AddForeignKey
ALTER TABLE "ConfiguracaoOrg" ADD CONSTRAINT "ConfiguracaoOrg_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
