-- CreateEnum
CREATE TYPE "DepoimentoStatus" AS ENUM ('rascunho', 'publicado', 'arquivado');

-- CreateTable
CREATE TABLE "Depoimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" TEXT,
    "comunidade" TEXT,
    "texto" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "foto" TEXT,
    "status" "DepoimentoStatus" NOT NULL DEFAULT 'rascunho',
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "consentimento" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depoimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Depoimento_status_idx" ON "Depoimento"("status");

-- CreateIndex
CREATE INDEX "Depoimento_destaque_idx" ON "Depoimento"("destaque");
