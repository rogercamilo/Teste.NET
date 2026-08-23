-- Material de direcionamento do retiro destinado ao FORMANDO (anexo separado do
-- material interno do formador) + liberação POR GRUPO. A existência de uma linha
-- em RetiroMaterialLiberacao = material liberado para aquele grupo (recolher =
-- apagar a linha). Escopo por grupo porque a grade é compartilhada por vários.

-- AlterTable
ALTER TABLE "RetiroPlano" ADD COLUMN     "materialFormandoAnexo" TEXT,
ADD COLUMN     "materialFormandoAnexoId" TEXT;

-- CreateTable
CREATE TABLE "RetiroMaterialLiberacao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "retiroPlanoId" TEXT NOT NULL,
    "grupoFormacaoId" TEXT NOT NULL,
    "liberadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberadoPor" TEXT,

    CONSTRAINT "RetiroMaterialLiberacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetiroMaterialLiberacao_organizacaoId_idx" ON "RetiroMaterialLiberacao"("organizacaoId");

-- CreateIndex
CREATE INDEX "RetiroMaterialLiberacao_grupoFormacaoId_idx" ON "RetiroMaterialLiberacao"("grupoFormacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "RetiroMaterialLiberacao_retiroPlanoId_grupoFormacaoId_key" ON "RetiroMaterialLiberacao"("retiroPlanoId", "grupoFormacaoId");

-- AddForeignKey
ALTER TABLE "RetiroMaterialLiberacao" ADD CONSTRAINT "RetiroMaterialLiberacao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetiroMaterialLiberacao" ADD CONSTRAINT "RetiroMaterialLiberacao_retiroPlanoId_fkey" FOREIGN KEY ("retiroPlanoId") REFERENCES "RetiroPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- GrupoFormacao mapeia para a tabela "morada" (@@map).
ALTER TABLE "RetiroMaterialLiberacao" ADD CONSTRAINT "RetiroMaterialLiberacao_grupoFormacaoId_fkey" FOREIGN KEY ("grupoFormacaoId") REFERENCES "morada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
