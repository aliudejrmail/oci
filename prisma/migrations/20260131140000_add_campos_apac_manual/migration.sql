-- Adicionar campos conforme Manual PMAE/OCI
-- Tipo de APAC: "3" = APAC Única (não admite continuidade)
ALTER TABLE "solicitacoes_oci" ADD COLUMN IF NOT EXISTS "tipoApac" TEXT DEFAULT '3';

-- Motivo de saída: 1.1, 1.2, 1.4, 1.5, 4.1, 4.2, 4.3
ALTER TABLE "solicitacoes_oci" ADD COLUMN IF NOT EXISTS "motivoSaida" TEXT;

-- Campos específicos para procedimentos oncológicos
ALTER TABLE "solicitacoes_oci" ADD COLUMN IF NOT EXISTS "dataDiagnosticoCitoHistopatologico" TIMESTAMP(3);
ALTER TABLE "solicitacoes_oci" ADD COLUMN IF NOT EXISTS "cidPrincipal" TEXT;
ALTER TABLE "solicitacoes_oci" ADD COLUMN IF NOT EXISTS "cidSecundario" TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS "solicitacoes_oci_tipoApac_idx" ON "solicitacoes_oci"("tipoApac");
CREATE INDEX IF NOT EXISTS "solicitacoes_oci_motivoSaida_idx" ON "solicitacoes_oci"("motivoSaida");
CREATE INDEX IF NOT EXISTS "solicitacoes_oci_cidPrincipal_idx" ON "solicitacoes_oci"("cidPrincipal");
