-- DropIndex
DROP INDEX "AuditLog_usuarioId_idx";

-- DropIndex
DROP INDEX "ConviteUsuario_token_idx";

-- DropIndex
DROP INDEX "ProcessoEclesiastico_organizacaoId_idx";

-- DropIndex
DROP INDEX "ProgressoEtapa_formandoId_idx";

-- DropIndex
DROP INDEX "PushSubscription_organizacaoId_idx";

-- DropIndex
DROP INDEX "RelatorioEtapa_formandoId_idx";

-- CreateIndex
CREATE INDEX "GradeFormativa_planoId_idx" ON "GradeFormativa"("planoId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
