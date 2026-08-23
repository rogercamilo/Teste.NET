-- AddColumn: estado da chamada registrado pelo formador (presente|ausente|justificado).
-- null = formador ainda não marcou (distinto de "ausente"); uma linha pode existir
-- só por RSVP do formando sem o FC ter feito a chamada.
ALTER TABLE "PresencaFormacao" ADD COLUMN "statusFormador" TEXT;

-- Backfill das linhas existentes: antes deste campo, `presente` era a marcação do
-- formador. Linhas com justificativa do formador viram "justificado"; presente=true
-- vira "presente"; as demais (presente=false) viram "ausente".
UPDATE "PresencaFormacao" SET "statusFormador" = 'presente'    WHERE "presente" = true;
UPDATE "PresencaFormacao" SET "statusFormador" = 'justificado' WHERE "presente" = false AND "justificativa" IS NOT NULL AND btrim("justificativa") <> '';
UPDATE "PresencaFormacao" SET "statusFormador" = 'ausente'     WHERE "presente" = false AND "statusFormador" IS NULL;
