-- DropIndex
DROP INDEX "solicitacoes_oci_cidPrincipal_idx";

-- DropIndex
DROP INDEX "solicitacoes_oci_motivoSaida_idx";

-- DropIndex
DROP INDEX "solicitacoes_oci_tipoApac_idx";

-- CreateTable
CREATE TABLE "profissionais_unidades" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profissionais_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profissionais_unidades_profissionalId_idx" ON "profissionais_unidades"("profissionalId");

-- CreateIndex
CREATE INDEX "profissionais_unidades_unidadeId_idx" ON "profissionais_unidades"("unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_unidades_profissionalId_unidadeId_key" ON "profissionais_unidades"("profissionalId", "unidadeId");

-- CreateIndex
CREATE INDEX "pacientes_cpf_idx" ON "pacientes"("cpf");

-- AddForeignKey
ALTER TABLE "profissionais_unidades" ADD CONSTRAINT "profissionais_unidades_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais_unidades" ADD CONSTRAINT "profissionais_unidades_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades_saude"("id") ON DELETE CASCADE ON UPDATE CASCADE;
