-- Devolução de revisão da Jornada Vocacional: motivo + carimbo de tempo.
ALTER TABLE "ProcessoEclesiastico" ADD COLUMN "motivoDevolucao" TEXT;
ALTER TABLE "ProcessoEclesiastico" ADD COLUMN "devolvidoEm" TIMESTAMP(3);

-- Mensageria entre perfis ao longo do rito: devolução, entrada em revisão e conclusão.
ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'processo_devolvido';
ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'processo_em_revisao';
ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'processo_concluido';
ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'processo_iniciado';
