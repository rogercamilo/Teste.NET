-- Evento/compromisso de "Dia inteiro" (sem horário). Aditivo e não-destrutivo:
-- coluna booleana com default false; registros existentes permanecem com horário.
ALTER TABLE "Agendamento" ADD COLUMN "diaInteiro" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Compromisso" ADD COLUMN "diaInteiro" BOOLEAN NOT NULL DEFAULT false;
