-- AlterEnum
ALTER TYPE "PerfilUsuario" ADD VALUE 'super_admin';

-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "onboardingConcluido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyVersion" TEXT NOT NULL DEFAULT '1.0';

-- CreateTable
CREATE TABLE "ConviteUsuario" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "moradaId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteUsuario_token_key" ON "ConviteUsuario"("token");

-- CreateIndex
CREATE INDEX "ConviteUsuario_organizacaoId_idx" ON "ConviteUsuario"("organizacaoId");

-- CreateIndex
CREATE INDEX "ConviteUsuario_token_idx" ON "ConviteUsuario"("token");

-- AddForeignKey
ALTER TABLE "ConviteUsuario" ADD CONSTRAINT "ConviteUsuario_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteUsuario" ADD CONSTRAINT "ConviteUsuario_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
