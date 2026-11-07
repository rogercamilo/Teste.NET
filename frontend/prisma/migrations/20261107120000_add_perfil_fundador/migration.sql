-- Novo perfil de usuário `fundador` (visão executiva do tenant, construído sobre o
-- Formador Geral). Segue o precedente de `add_perfil_formador_pedagogico`: apenas
-- adiciona o valor ao enum Postgres. `IF NOT EXISTS` torna a migração idempotente.
ALTER TYPE "PerfilUsuario" ADD VALUE IF NOT EXISTS 'fundador';
