-- Material de direcionamento do retiro (comunitário): anexo destinado ao
-- FORMADOR, exibido na aplicação (plano e grade) e nunca no Portal do Formando.
-- AlterTable
ALTER TABLE "RetiroPlano" ADD COLUMN     "materialAnexo" TEXT,
ADD COLUMN     "materialAnexoId" TEXT;
