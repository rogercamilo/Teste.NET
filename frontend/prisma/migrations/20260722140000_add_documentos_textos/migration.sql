-- Blocos de texto editáveis dos documentos da Jornada (mapa bloco.id -> texto).
-- Null => usa o texto padrão do registro no código.
ALTER TABLE "Organizacao" ADD COLUMN "documentosTextos" JSONB;
