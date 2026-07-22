-- Invariante multi-tenant: 1 e-mail = 1 organização.
--
-- O login resolve a identidade por e-mail GLOBALMENTE (authenticateGlobal →
-- findByEmailGlobal); isso só é correto se um e-mail ativo existir em, no máximo,
-- uma organização. O índice @@unique([email, organizacaoId]) garante unicidade
-- apenas DENTRO de cada org — permitia o mesmo e-mail ativo em orgs distintas,
-- deixando a conta da org mais nova inacessível pelo login.
--
-- Este índice único PARCIAL fecha o furo na camada do banco (protege contra corrida
-- entre dois cadastros concorrentes que passariam pela checagem da aplicação):
--   • lower(email) → case-insensitive, espelhando findByEmailGlobal (mode:"insensitive");
--   • WHERE "deletedAt" IS NULL → conta apenas registros ATIVOS, preservando o
--     revive de usuário soft-deleted (createUser) e a troca de org após exclusão.
--
-- Produção sondada antes de aplicar: 0 colisões ativas sob lower(email) (10 usuários,
-- 4 orgs). Aplica sem necessidade de saneamento prévio.
--
-- ATENÇÃO (drift do Prisma): índices parciais não são representáveis no schema.prisma.
-- Um `prisma migrate dev` futuro tentará gerar um DROP deste índice como "drift" —
-- REMOVA esse DROP da migração gerada. Ver nota no model Usuario em schema.prisma.
CREATE UNIQUE INDEX "Usuario_email_lower_active_key"
  ON "Usuario" (lower("email"))
  WHERE "deletedAt" IS NULL;
