-- Corrige FK violation: execucoes_procedimentos_status_fkey
-- Execute no Neon Console, pgAdmin, DBeaver ou: psql $DATABASE_URL -f scripts/corrigir-status-execucao.sql

-- 1. Garantir que REALIZADO existe
INSERT INTO "status_execucao" ("codigo", "descricao")
VALUES ('REALIZADO', 'Realizado')
ON CONFLICT ("codigo") DO NOTHING;

-- 2. Atualizar execuções que usam EXECUTADO
UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO';

-- 3. Remover EXECUTADO
DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO';
