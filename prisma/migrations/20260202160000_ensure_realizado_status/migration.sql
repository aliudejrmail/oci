-- Garantir que REALIZADO existe em status_execucao (idempotente).
-- Corrige FK violation quando migration 20260202150000 não foi aplicada ou banco ainda tem EXECUTADO.
INSERT INTO "status_execucao" ("codigo", "descricao")
VALUES ('REALIZADO', 'Realizado')
ON CONFLICT ("codigo") DO NOTHING;

-- Atualizar execuções que ainda usam EXECUTADO para REALIZADO
UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO';

-- Remover código antigo EXECUTADO (se existir)
DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO';
