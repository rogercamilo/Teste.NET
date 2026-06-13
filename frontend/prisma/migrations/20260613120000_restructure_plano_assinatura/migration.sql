-- Reestruturação dos planos de assinatura do Formattio
-- ESSENCIAL → BASICO  (R$97/mês | 60 usuários)
-- PROFISSIONAL → INTERMEDIARIO  (R$197/mês | 140 usuários)
-- + AVANCADO  (R$397/mês | 350 usuários)
-- + PERSONALIZADO  (negociado | ilimitado)
-- GRATUITO mantido como estado interno (sem assinatura ativa)

ALTER TYPE "PlanoAssinatura" RENAME VALUE 'ESSENCIAL' TO 'BASICO';
ALTER TYPE "PlanoAssinatura" RENAME VALUE 'PROFISSIONAL' TO 'INTERMEDIARIO';
ALTER TYPE "PlanoAssinatura" ADD VALUE IF NOT EXISTS 'AVANCADO';
ALTER TYPE "PlanoAssinatura" ADD VALUE IF NOT EXISTS 'PERSONALIZADO';
