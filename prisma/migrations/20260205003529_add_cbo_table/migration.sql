-- AlterTable
ALTER TABLE "profissionais" ADD COLUMN     "cboId" TEXT,
ALTER COLUMN "cbo" DROP NOT NULL;

-- CreateTable
CREATE TABLE "cbos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cbos_codigo_key" ON "cbos"("codigo");

-- CreateIndex
CREATE INDEX "cbos_codigo_idx" ON "cbos"("codigo");

-- CreateIndex
CREATE INDEX "profissionais_cboId_idx" ON "profissionais"("cboId");

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_cboId_fkey" FOREIGN KEY ("cboId") REFERENCES "cbos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
