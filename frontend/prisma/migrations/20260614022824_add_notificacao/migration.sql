-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('nova_formacao', 'novo_formando', 'novo_agendamento', 'processo_aprovado', 'plano_atribuido', 'plano_atualizado', 'grade_atribuida', 'grade_atualizada', 'dados_formando_pendentes');

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT,
    "linkAcao" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_destinatarioId_lida_idx" ON "Notificacao"("destinatarioId", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_organizacaoId_idx" ON "Notificacao"("organizacaoId");

-- CreateIndex
CREATE INDEX "Notificacao_criadaEm_idx" ON "Notificacao"("criadaEm");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
