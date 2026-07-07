-- CreateEnum
CREATE TYPE "NewsletterLeadStatus" AS ENUM ('pendente', 'confirmado', 'descadastrado');

-- CreateTable
CREATE TABLE "NewsletterLead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "NewsletterLeadStatus" NOT NULL DEFAULT 'pendente',
    "origem" TEXT NOT NULL DEFAULT 'landing',
    "token" TEXT NOT NULL,
    "consentLGPD" BOOLEAN NOT NULL DEFAULT false,
    "consentEm" TIMESTAMP(3),
    "consentVersao" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "ipAnon" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEm" TIMESTAMP(3),
    "descadastradoEm" TIMESTAMP(3),

    CONSTRAINT "NewsletterLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterLead_email_key" ON "NewsletterLead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterLead_token_key" ON "NewsletterLead"("token");

-- CreateIndex
CREATE INDEX "NewsletterLead_status_idx" ON "NewsletterLead"("status");

-- CreateIndex
CREATE INDEX "NewsletterLead_criadoEm_idx" ON "NewsletterLead"("criadoEm");
