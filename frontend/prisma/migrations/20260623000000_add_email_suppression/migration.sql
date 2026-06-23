-- CreateEnum
CREATE TYPE "EmailSuppressionMotivo" AS ENUM ('BOUNCE', 'COMPLAINT');

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motivo" "EmailSuppressionMotivo" NOT NULL,
    "detalhe" TEXT,
    "emailId" TEXT,
    "organizacaoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "EmailSuppression_organizacaoId_idx" ON "EmailSuppression"("organizacaoId");
