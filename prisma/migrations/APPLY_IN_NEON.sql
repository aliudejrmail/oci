-- =====================================================
-- MIGRAÇÕES PENDENTES - APLICAR NO CONSOLE DO NEON
-- =====================================================
-- Este script consolida todas as migrações pendentes
-- Aplique no SQL Editor do console Neon
-- =====================================================

-- MIGRAÇÃO 1: add_profissional_unidades (20260205002805)
-- =====================================================

-- Remover índices antigos (se existirem)
DROP INDEX IF EXISTS "solicitacoes_oci_cidPrincipal_idx";
DROP INDEX IF EXISTS "solicitacoes_oci_motivoSaida_idx";
DROP INDEX IF EXISTS "solicitacoes_oci_tipoApac_idx";

-- Criar tabela profissionais_unidades
CREATE TABLE IF NOT EXISTS "profissionais_unidades" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profissionais_unidades_pkey" PRIMARY KEY ("id")
);

-- Índices para profissionais_unidades
CREATE INDEX IF NOT EXISTS "profissionais_unidades_profissionalId_idx" 
    ON "profissionais_unidades"("profissionalId");

CREATE INDEX IF NOT EXISTS "profissionais_unidades_unidadeId_idx" 
    ON "profissionais_unidades"("unidadeId");

CREATE UNIQUE INDEX IF NOT EXISTS "profissionais_unidades_profissionalId_unidadeId_key" 
    ON "profissionais_unidades"("profissionalId", "unidadeId");

-- Índice para pacientes
CREATE INDEX IF NOT EXISTS "pacientes_cpf_idx" ON "pacientes"("cpf");

-- Foreign keys para profissionais_unidades
ALTER TABLE "profissionais_unidades" 
    DROP CONSTRAINT IF EXISTS "profissionais_unidades_profissionalId_fkey";
ALTER TABLE "profissionais_unidades" 
    ADD CONSTRAINT "profissionais_unidades_profissionalId_fkey" 
    FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profissionais_unidades" 
    DROP CONSTRAINT IF EXISTS "profissionais_unidades_unidadeId_fkey";
ALTER TABLE "profissionais_unidades" 
    ADD CONSTRAINT "profissionais_unidades_unidadeId_fkey" 
    FOREIGN KEY ("unidadeId") REFERENCES "unidades_saude"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- MIGRAÇÃO 2: add_cbo_table (20260205003529)
-- =====================================================

-- Alterar tabela profissionais
ALTER TABLE "profissionais" 
    ADD COLUMN IF NOT EXISTS "cboId" TEXT;

ALTER TABLE "profissionais" 
    ALTER COLUMN "cbo" DROP NOT NULL;

-- Criar tabela cbos
CREATE TABLE IF NOT EXISTS "cbos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbos_pkey" PRIMARY KEY ("id")
);

-- Índices para cbos
CREATE UNIQUE INDEX IF NOT EXISTS "cbos_codigo_key" ON "cbos"("codigo");
CREATE INDEX IF NOT EXISTS "cbos_codigo_idx" ON "cbos"("codigo");

-- Índice para profissionais.cboId
CREATE INDEX IF NOT EXISTS "profissionais_cboId_idx" ON "profissionais"("cboId");

-- Foreign key para profissionais.cboId
ALTER TABLE "profissionais" 
    DROP CONSTRAINT IF EXISTS "profissionais_cboId_fkey";
ALTER TABLE "profissionais" 
    ADD CONSTRAINT "profissionais_cboId_fkey" 
    FOREIGN KEY ("cboId") REFERENCES "cbos"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- MIGRAÇÃO 3: add_medico_solicitante_solicitacao (20260205120000)
-- =====================================================

-- Adicionar campo medicoSolicitanteId
ALTER TABLE "solicitacoes_oci" 
    ADD COLUMN IF NOT EXISTS "medicoSolicitanteId" TEXT;

-- Foreign key para médico solicitante
ALTER TABLE "solicitacoes_oci"
    DROP CONSTRAINT IF EXISTS "solicitacoes_oci_medicoSolicitanteId_fkey";
ALTER TABLE "solicitacoes_oci"
    ADD CONSTRAINT "solicitacoes_oci_medicoSolicitanteId_fkey"
    FOREIGN KEY ("medicoSolicitanteId") REFERENCES "profissionais"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Índice para médico solicitante
CREATE INDEX IF NOT EXISTS "solicitacoes_oci_medicoSolicitanteId_idx" 
    ON "solicitacoes_oci"("medicoSolicitanteId");

-- MIGRAÇÃO 4: add_lockout_fields (20260211195000)
-- =====================================================

-- Adicionar campos de bloqueio e acesso à tabela usuarios
ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "tentativasLogin" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "bloqueadoEm" TIMESTAMP(3);

ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "ultimoAcesso" TIMESTAMP(3);

-- MIGRAÇÃO 5: add_auditoria_table (20260211224000)
-- =====================================================

-- Criar tabela auditoria
CREATE TABLE IF NOT EXISTS "auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS "auditoria_usuarioId_idx" ON "auditoria"("usuarioId");
CREATE INDEX IF NOT EXISTS "auditoria_acao_idx" ON "auditoria"("acao");
CREATE INDEX IF NOT EXISTS "auditoria_entidade_entidadeId_idx" ON "auditoria"("entidade", "entidadeId");
CREATE INDEX IF NOT EXISTS "auditoria_createdAt_idx" ON "auditoria"("createdAt");

-- Foreign key para auditoria.usuarioId
ALTER TABLE "auditoria" 
    DROP CONSTRAINT IF EXISTS "auditoria_usuarioId_fkey";
ALTER TABLE "auditoria" 
    ADD CONSTRAINT "auditoria_usuarioId_fkey" 
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- FIM DAS MIGRAÇÕES
-- =====================================================
-- Após executar este script no Neon, execute no terminal:
-- npx prisma migrate resolve --applied 20260205002805_add_profissional_unidades
-- npx prisma migrate resolve --applied 20260205003529_add_cbo_table
-- npx prisma migrate resolve --applied 20260205120000_add_medico_solicitante_solicitacao
-- =====================================================
