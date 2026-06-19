-- AlterTable: add tokenAssinatura (magic link token) to Formando
ALTER TABLE "Formando" ADD COLUMN "tokenAssinatura" TEXT;

-- AlterTable: add formandoId and grupoFormacaoId to PushSubscription
ALTER TABLE "PushSubscription" ADD COLUMN "formandoId" TEXT,
ADD COLUMN "grupoFormacaoId" TEXT;

-- CreateIndex: unique token per formando
CREATE UNIQUE INDEX "Formando_tokenAssinatura_key" ON "Formando"("tokenAssinatura");

-- CreateIndex: lookup subscriptions by formando
CREATE INDEX "PushSubscription_formandoId_idx" ON "PushSubscription"("formandoId");

-- CreateIndex: lookup subscriptions by group (for sendPushToGroup)
CREATE INDEX "PushSubscription_grupoFormacaoId_idx" ON "PushSubscription"("grupoFormacaoId");

-- AddForeignKey: formando → PushSubscription (SetNull on delete)
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_formandoId_fkey"
  FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE SET NULL ON UPDATE CASCADE;
