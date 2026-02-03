-- AlterTable
ALTER TABLE "execucoes_procedimentos" ADD COLUMN IF NOT EXISTS "resultadoBiopsia" TEXT;
ALTER TABLE "execucoes_procedimentos" ADD COLUMN IF NOT EXISTS "dataRegistroResultadoBiopsia" TIMESTAMP(3);
