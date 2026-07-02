-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "lembrete24hEnviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lembrete2hEnviado" BOOLEAN NOT NULL DEFAULT false;
