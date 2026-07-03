-- CreateTable
CREATE TABLE "agendamento_grupo" (
    "agendamentoId" TEXT NOT NULL,
    "morada_id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_grupo_pkey" PRIMARY KEY ("agendamentoId","morada_id")
);

-- CreateIndex
CREATE INDEX "agendamento_grupo_morada_id_idx" ON "agendamento_grupo"("morada_id");

-- AddForeignKey
ALTER TABLE "agendamento_grupo" ADD CONSTRAINT "agendamento_grupo_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_grupo" ADD CONSTRAINT "agendamento_grupo_morada_id_fkey" FOREIGN KEY ("morada_id") REFERENCES "morada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (item 1.7): 1 linha de junção por agendamento single-group já existente,
-- para que a junção seja a fonte única de alvos também no histórico.
INSERT INTO "agendamento_grupo" ("agendamentoId", "morada_id", "criadoEm")
SELECT "id", "morada_id", CURRENT_TIMESTAMP
FROM "Agendamento"
WHERE "morada_id" IS NOT NULL
ON CONFLICT DO NOTHING;
