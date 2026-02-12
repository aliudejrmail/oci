-- MIGRAÇÃO 5: add_auditoria_table (20260211224000)
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
