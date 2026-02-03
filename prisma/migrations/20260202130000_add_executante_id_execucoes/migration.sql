-- AlterTable: adiciona executanteId em execucoes_procedimentos (usuário executante para quem foi agendado)
ALTER TABLE "execucoes_procedimentos" ADD COLUMN "executanteId" TEXT;

-- CreateIndex
CREATE INDEX "execucoes_procedimentos_executanteId_idx" ON "execucoes_procedimentos"("executanteId");

-- AddForeignKey
ALTER TABLE "execucoes_procedimentos" ADD CONSTRAINT "execucoes_procedimentos_executanteId_fkey" 
FOREIGN KEY ("executanteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
