-- AlterTable
ALTER TABLE "RegistroPromessa" ADD COLUMN     "criadoPorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RegistroPromessa_organizacaoId_tomo_numero_key" ON "RegistroPromessa"("organizacaoId", "tomo", "numero");
