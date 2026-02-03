-- AlterTable: adiciona colunas unidadeId e unidadeExecutanteId em usuarios
ALTER TABLE "usuarios" ADD COLUMN "unidadeId" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "unidadeExecutanteId" TEXT;

-- AlterTable: adiciona executante e solicitante em unidades_saude
ALTER TABLE "unidades_saude" ADD COLUMN "executante" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "unidades_saude" ADD COLUMN "solicitante" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "usuarios_unidadeId_idx" ON "usuarios"("unidadeId");
CREATE INDEX "usuarios_unidadeExecutanteId_idx" ON "usuarios"("unidadeExecutanteId");
CREATE INDEX "unidades_saude_executante_idx" ON "unidades_saude"("executante");
CREATE INDEX "unidades_saude_solicitante_idx" ON "unidades_saude"("solicitante");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidadeExecutanteId_fkey" FOREIGN KEY ("unidadeExecutanteId") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
