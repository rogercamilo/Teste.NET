-- Catálogo de ministérios/serviços comunitários do tenant (não canônicos).
-- Definido pelo Formador Geral/Admin; alimenta o processo de Ministério.
ALTER TABLE "Organizacao" ADD COLUMN "ministerios" TEXT[] NOT NULL DEFAULT '{}';
