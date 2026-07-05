-- AlterTable
ALTER TABLE "Organizacao" ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "ParticipacaoVocacional" ADD COLUMN     "muralOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "morada" ADD COLUMN     "muralFrutosAtivo" BOOLEAN NOT NULL DEFAULT false;
