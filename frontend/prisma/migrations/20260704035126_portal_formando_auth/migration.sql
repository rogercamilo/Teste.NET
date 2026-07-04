-- CreateEnum
CREATE TYPE "TipoTokenAcessoFormando" AS ENUM ('ativacao', 'reset');

-- AlterTable
ALTER TABLE "Formando" ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FormandoAccessToken" (
    "id" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tipo" "TipoTokenAcessoFormando" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormandoAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormandoAccessToken_tokenHash_key" ON "FormandoAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "FormandoAccessToken_formandoId_idx" ON "FormandoAccessToken"("formandoId");

-- CreateIndex
CREATE INDEX "FormandoAccessToken_expiresAt_idx" ON "FormandoAccessToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "FormandoAccessToken" ADD CONSTRAINT "FormandoAccessToken_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;
