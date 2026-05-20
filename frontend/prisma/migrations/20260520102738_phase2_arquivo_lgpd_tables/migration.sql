-- AlterTable
ALTER TABLE "Arquivo" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "extensao" TEXT NOT NULL DEFAULT '.pdf',
ADD COLUMN     "formandoId" TEXT,
ADD COLUMN     "formandoNome" TEXT,
ADD COLUMN     "moradaId" TEXT,
ADD COLUMN     "tipoEvento" TEXT,
ADD COLUMN     "uploadedByNome" TEXT;

-- AlterTable
ALTER TABLE "GradeFormativa" ADD COLUMN     "nome" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "PrivacyAcceptance" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "tipo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookieConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "organizacaoId" TEXT,
    "necessarios" BOOLEAN NOT NULL DEFAULT true,
    "analiticos" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "preferencias" BOOLEAN NOT NULL DEFAULT false,
    "versao" TEXT NOT NULL DEFAULT '1',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "organizacaoId" TEXT,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivacyAcceptance_usuarioId_idx" ON "PrivacyAcceptance"("usuarioId");

-- CreateIndex
CREATE INDEX "CookieConsent_userId_idx" ON "CookieConsent"("userId");

-- CreateIndex
CREATE INDEX "DeletionRequest_usuarioId_idx" ON "DeletionRequest"("usuarioId");

-- CreateIndex
CREATE INDEX "DeletionRequest_organizacaoId_idx" ON "DeletionRequest"("organizacaoId");

-- CreateIndex
CREATE INDEX "Arquivo_entityType_entityId_idx" ON "Arquivo"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "PrivacyAcceptance" ADD CONSTRAINT "PrivacyAcceptance_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
