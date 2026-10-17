-- CreateTable
-- Lead de ACESSO ANTECIPADO (alta intenção) captado na landing. Nível plataforma
-- (sem organizacaoId), como o NewsletterLead. Sem double opt-in.
CREATE TABLE "AcessoAntecipadoLead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" TEXT,
    "comunidade" TEXT NOT NULL,
    "tipoOrganizacao" TEXT NOT NULL,
    "numeroMembros" TEXT NOT NULL,
    "intencao" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "desafio" TEXT,
    "planoInteresse" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'acesso-antecipado',
    "status" TEXT NOT NULL DEFAULT 'novo',
    "consentLGPD" BOOLEAN NOT NULL DEFAULT false,
    "consentEm" TIMESTAMP(3),
    "consentVersao" TEXT,
    "ipAnon" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoAntecipadoLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcessoAntecipadoLead_status_idx" ON "AcessoAntecipadoLead"("status");

-- CreateIndex
CREATE INDEX "AcessoAntecipadoLead_criadoEm_idx" ON "AcessoAntecipadoLead"("criadoEm");
