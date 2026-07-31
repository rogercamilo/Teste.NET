-- Acompanhamento Comunitário (evento 1:1 na Agenda): alvo polimórfico e exclusivo
-- (formando p/ fluxo do FC, usuário-formador p/ fluxo do Formador Geral).
-- Colunas nulas + FKs SET NULL: seguro em base com dados (sem órfãos).

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "acompanhadoFormandoId" TEXT,
ADD COLUMN     "acompanhadoUsuarioId" TEXT;

-- CreateIndex
CREATE INDEX "Agendamento_acompanhadoFormandoId_idx" ON "Agendamento"("acompanhadoFormandoId");

-- CreateIndex
CREATE INDEX "Agendamento_acompanhadoUsuarioId_idx" ON "Agendamento"("acompanhadoUsuarioId");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_acompanhadoFormandoId_fkey" FOREIGN KEY ("acompanhadoFormandoId") REFERENCES "Formando"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_acompanhadoUsuarioId_fkey" FOREIGN KEY ("acompanhadoUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
