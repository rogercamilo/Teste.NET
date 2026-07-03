-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_formacaoId_fkey";

-- AlterTable: eventos avulsos (retiro/convocação/reunião/outro) não exigem Formação.
ALTER TABLE "Agendamento" ADD COLUMN     "tipoEvento" TEXT NOT NULL DEFAULT 'formacao',
ALTER COLUMN "formacaoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_formacaoId_fkey" FOREIGN KEY ("formacaoId") REFERENCES "Formacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
