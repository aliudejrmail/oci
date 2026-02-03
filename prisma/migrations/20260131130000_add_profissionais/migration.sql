-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cns" TEXT NOT NULL,
    "cbo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_cns_key" ON "profissionais"("cns");

-- CreateIndex
CREATE INDEX "profissionais_nome_idx" ON "profissionais"("nome");

-- CreateIndex
CREATE INDEX "profissionais_cns_idx" ON "profissionais"("cns");
