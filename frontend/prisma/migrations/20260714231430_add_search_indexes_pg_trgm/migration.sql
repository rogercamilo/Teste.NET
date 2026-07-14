-- Índices GIN de busca dependem da extensão pg_trgm (trusted no PostgreSQL 13+,
-- criável pelo usuário da aplicação). Precede os CREATE INDEX ... gin_trgm_ops.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Formacao_tema_idx" ON "Formacao" USING GIN ("tema" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Formando_organizacaoId_deletedAt_nome_idx" ON "Formando"("organizacaoId", "deletedAt", "nome");

-- CreateIndex
CREATE INDEX "Formando_nome_idx" ON "Formando" USING GIN ("nome" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "GradeFormativa_nome_idx" ON "GradeFormativa" USING GIN ("nome" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PlanoFormativo_nome_idx" ON "PlanoFormativo" USING GIN ("nome" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "morada_nome_idx" ON "morada" USING GIN ("nome" gin_trgm_ops);
