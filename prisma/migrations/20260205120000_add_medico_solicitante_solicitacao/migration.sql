-- AlterTable: adicionar médico solicitante na solicitação OCI
ALTER TABLE "solicitacoes_oci" ADD COLUMN "medicoSolicitanteId" TEXT;

-- Foreign key para profissionais (médico solicitante)
ALTER TABLE "solicitacoes_oci"
  ADD CONSTRAINT "solicitacoes_oci_medicoSolicitanteId_fkey"
  FOREIGN KEY ("medicoSolicitanteId") REFERENCES "profissionais"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Índice para otimizar consultas por médico solicitante
CREATE INDEX "solicitacoes_oci_medicoSolicitanteId_idx" ON "solicitacoes_oci"("medicoSolicitanteId");
