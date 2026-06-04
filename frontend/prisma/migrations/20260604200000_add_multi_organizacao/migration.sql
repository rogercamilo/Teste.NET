-- =============================================================================
-- Migration: add_multi_organizacao
-- Corrige drift schema→DB (Morada→morada, camelCase→snake_case)
-- e adiciona suporte multi-instituição.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rename da tabela Morada → morada (alinha com @@map("morada"))
-- ---------------------------------------------------------------------------
ALTER TABLE "Morada" RENAME TO "morada";

-- ---------------------------------------------------------------------------
-- 2. Rename de colunas FK moradaId → morada_id em todas as tabelas
-- ---------------------------------------------------------------------------
ALTER TABLE "Usuario"       RENAME COLUMN "moradaId" TO "morada_id";
ALTER TABLE "Formando"      RENAME COLUMN "moradaId" TO "morada_id";
ALTER TABLE "Agendamento"   RENAME COLUMN "moradaId" TO "morada_id";
ALTER TABLE "Arquivo"       RENAME COLUMN "moradaId" TO "morada_id";
ALTER TABLE "ConviteUsuario" RENAME COLUMN "moradaId" TO "morada_id";

-- ---------------------------------------------------------------------------
-- 3. Rename da coluna termoMorada → termo_morada em Organizacao
-- ---------------------------------------------------------------------------
ALTER TABLE "Organizacao" RENAME COLUMN "termoMorada" TO "termo_morada";

-- ---------------------------------------------------------------------------
-- 4. Recriar índices que referenciavam os nomes antigos
-- (PostgreSQL renomeia automaticamente índices simples na RENAME COLUMN,
--  mas os índices nomeados explicitamente precisam ser recriados)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "Formando_moradaId_idx";
CREATE INDEX "Formando_morada_id_idx" ON "Formando"("morada_id");

DROP INDEX IF EXISTS "Agendamento_moradaId_idx";
CREATE INDEX "Agendamento_morada_id_idx" ON "Agendamento"("morada_id");

-- ---------------------------------------------------------------------------
-- 5. Novos enums: TipoOrganizacao e TipoGrupoFormacao
-- ---------------------------------------------------------------------------
CREATE TYPE "TipoOrganizacao" AS ENUM (
  'nova_comunidade',
  'grupo_oracao',
  'instituto_religioso',
  'centro_formativo'
);

CREATE TYPE "TipoGrupoFormacao" AS ENUM ('estruturado', 'livre');

-- ---------------------------------------------------------------------------
-- 6. Campo tipoOrganizacao em Organizacao
-- ---------------------------------------------------------------------------
ALTER TABLE "Organizacao"
  ADD COLUMN "tipoOrganizacao" "TipoOrganizacao" NOT NULL DEFAULT 'nova_comunidade';

-- ---------------------------------------------------------------------------
-- 7. nivelFormativo torna-se nullable em morada (grupos livres não têm etapa)
-- ---------------------------------------------------------------------------
ALTER TABLE "morada" ALTER COLUMN "nivelFormativo" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. Campo tipo em morada (default estruturado — mantém todos os grupos atuais)
-- ---------------------------------------------------------------------------
ALTER TABLE "morada"
  ADD COLUMN "tipo" "TipoGrupoFormacao" NOT NULL DEFAULT 'estruturado';
