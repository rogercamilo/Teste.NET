-- Glossário dos documentos da Jornada: termo do ato de consagração e da pessoa
-- consagrada, editáveis por organização (default preserva o texto atual).
ALTER TABLE "Organizacao" ADD COLUMN "termoConsagracao" TEXT NOT NULL DEFAULT 'Consagração';
ALTER TABLE "Organizacao" ADD COLUMN "termoConsagrado" TEXT NOT NULL DEFAULT 'Consagrado(a)';
