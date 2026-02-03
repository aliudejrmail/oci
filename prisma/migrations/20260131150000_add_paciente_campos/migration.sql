-- Adicionar campos ao modelo Paciente
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "cns" TEXT;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "responsavel" TEXT;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "cep" TEXT;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "logradouro" TEXT;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "numero" TEXT;
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "bairro" TEXT;

-- Índices para busca
CREATE INDEX IF NOT EXISTS "pacientes_nome_idx" ON "pacientes"("nome");
CREATE INDEX IF NOT EXISTS "pacientes_cns_idx" ON "pacientes"("cns");
