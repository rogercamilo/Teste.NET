-- Acompanhamento do FORMANDO (jornada formativa comunitária): encontro marcado
-- pelo formador + pedido do formando via portal. Reaproveita o enum de status
-- StatusSolicitacaoAcompanhamento já existente (período vocacional).

-- CreateTable
CREATE TABLE "AcompanhamentoFormando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "nota" TEXT,
    "solicitadoPeloFormando" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcompanhamentoFormando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoAcompanhamentoFormando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagem" TEXT,
    "status" "StatusSolicitacaoAcompanhamento" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "SolicitacaoAcompanhamentoFormando_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcompanhamentoFormando_organizacaoId_idx" ON "AcompanhamentoFormando"("organizacaoId");
CREATE INDEX "AcompanhamentoFormando_formandoId_idx" ON "AcompanhamentoFormando"("formandoId");
CREATE INDEX "SolicitacaoAcompanhamentoFormando_organizacaoId_idx" ON "SolicitacaoAcompanhamentoFormando"("organizacaoId");
CREATE INDEX "SolicitacaoAcompanhamentoFormando_formandoId_idx" ON "SolicitacaoAcompanhamentoFormando"("formandoId");
CREATE INDEX "SolicitacaoAcompanhamentoFormando_status_idx" ON "SolicitacaoAcompanhamentoFormando"("status");

-- AddForeignKey
ALTER TABLE "AcompanhamentoFormando" ADD CONSTRAINT "AcompanhamentoFormando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcompanhamentoFormando" ADD CONSTRAINT "AcompanhamentoFormando_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcompanhamentoFormando" ADD CONSTRAINT "AcompanhamentoFormando_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoAcompanhamentoFormando" ADD CONSTRAINT "SolicitacaoAcompanhamentoFormando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoAcompanhamentoFormando" ADD CONSTRAINT "SolicitacaoAcompanhamentoFormando_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;
