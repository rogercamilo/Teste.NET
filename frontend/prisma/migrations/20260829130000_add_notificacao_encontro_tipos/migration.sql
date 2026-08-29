-- AlterEnum
-- Tipos de notificação voltados ao FORMANDO para eventos de agenda (histórico
-- in-app): encontro criado, atualizado (confirmado/cancelado/remarcado) e lembrete.
ALTER TYPE "TipoNotificacao" ADD VALUE 'encontro_agendado';
ALTER TYPE "TipoNotificacao" ADD VALUE 'encontro_atualizado';
ALTER TYPE "TipoNotificacao" ADD VALUE 'encontro_lembrete';
