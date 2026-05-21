-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nomePlataforma" TEXT,
ADD COLUMN     "temaCor" TEXT NOT NULL DEFAULT 'azul';
