-- AlterTable: endereço residencial auto-declarado do formando (portal)
ALTER TABLE "Formando"
  ADD COLUMN "endereco" TEXT,
  ADD COLUMN "numero" TEXT,
  ADD COLUMN "complemento" TEXT,
  ADD COLUMN "bairro" TEXT,
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "estado" TEXT,
  ADD COLUMN "paisResidencia" TEXT;
