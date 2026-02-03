-- CreateTable
CREATE TABLE "unidades_saude" (
    "id" TEXT NOT NULL,
    "cnes" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_saude_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidades_saude_cnes_key" ON "unidades_saude"("cnes");

-- CreateIndex
CREATE INDEX "unidades_saude_nome_idx" ON "unidades_saude"("nome");

