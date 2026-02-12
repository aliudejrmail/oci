-- MIGRAÇÃO 4: add_lockout_fields (20260211195000)
-- Adicionar campos de bloqueio e acesso à tabela usuarios
ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "tentativasLogin" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "bloqueadoEm" TIMESTAMP(3);

ALTER TABLE "usuarios" 
    ADD COLUMN IF NOT EXISTS "ultimoAcesso" TIMESTAMP(3);
