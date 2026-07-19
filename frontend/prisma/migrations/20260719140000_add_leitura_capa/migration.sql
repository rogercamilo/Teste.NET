-- Capa do livro (storageKey R2/local). Nula: livros existentes seguem sem capa.
ALTER TABLE "LeituraVocacional" ADD COLUMN "capaUrl" TEXT;
