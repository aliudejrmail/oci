-- CreateTable: catálogo de procedimentos da Tabela SIGTAP (tb_procedimento)
CREATE TABLE "procedimentos_sigtap" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoComplexidade" TEXT,
    "competencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedimentos_sigtap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedimentos_sigtap_codigo_key" ON "procedimentos_sigtap"("codigo");

-- CreateIndex
CREATE INDEX "procedimentos_sigtap_nome_idx" ON "procedimentos_sigtap"("nome");
