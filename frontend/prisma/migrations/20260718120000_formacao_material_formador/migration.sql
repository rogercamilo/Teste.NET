-- Segundo anexo opcional da Formação: material destinado ao FORMADOR (uso
-- interno, nunca exibido no Portal do Formando). O anexo já existente
-- (documentoAnexo/Id) permanece como material do FORMANDO — servido no portal.
-- AlterTable
ALTER TABLE "Formacao" ADD COLUMN     "materialFormadorAnexo" TEXT,
ADD COLUMN     "materialFormadorAnexoId" TEXT;
