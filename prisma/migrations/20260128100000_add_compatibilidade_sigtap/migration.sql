-- CreateTable: compatibilidade procedimento SIGTAP (OCI grupo 09) × CID
CREATE TABLE "compatibilidade_cid_sigtap" (
    "id" TEXT NOT NULL,
    "procedimentoSigtapId" TEXT NOT NULL,
    "cidCodigo" TEXT NOT NULL,
    "cidDescricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compatibilidade_cid_sigtap_pkey" PRIMARY KEY ("id")
);

-- CreateTable: compatibilidade procedimento SIGTAP (OCI grupo 09) × CBO
CREATE TABLE "compatibilidade_cbo_sigtap" (
    "id" TEXT NOT NULL,
    "procedimentoSigtapId" TEXT NOT NULL,
    "cboCodigo" TEXT NOT NULL,
    "cboDescricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compatibilidade_cbo_sigtap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compatibilidade_cid_sigtap_procedimentoSigtapId_cidCodigo_key" ON "compatibilidade_cid_sigtap"("procedimentoSigtapId", "cidCodigo");

-- CreateIndex
CREATE INDEX "compatibilidade_cid_sigtap_cidCodigo_idx" ON "compatibilidade_cid_sigtap"("cidCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "compatibilidade_cbo_sigtap_procedimentoSigtapId_cboCodigo_key" ON "compatibilidade_cbo_sigtap"("procedimentoSigtapId", "cboCodigo");

-- CreateIndex
CREATE INDEX "compatibilidade_cbo_sigtap_cboCodigo_idx" ON "compatibilidade_cbo_sigtap"("cboCodigo");

-- AddForeignKey
ALTER TABLE "compatibilidade_cid_sigtap" ADD CONSTRAINT "compatibilidade_cid_sigtap_procedimentoSigtapId_fkey" FOREIGN KEY ("procedimentoSigtapId") REFERENCES "procedimentos_sigtap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibilidade_cbo_sigtap" ADD CONSTRAINT "compatibilidade_cbo_sigtap_procedimentoSigtapId_fkey" FOREIGN KEY ("procedimentoSigtapId") REFERENCES "procedimentos_sigtap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
