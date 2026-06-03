-- AlterTable
ALTER TABLE "Organizacao" ALTER COLUMN "termoMorada" SET DEFAULT 'Grupo de Formação';

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_organizacaoId_idx" ON "PushSubscription"("organizacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_organizacaoId_endpoint_key" ON "PushSubscription"("organizacaoId", "endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
