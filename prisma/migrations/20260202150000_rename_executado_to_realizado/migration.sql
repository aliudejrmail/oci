-- Renomear status EXECUTADO para REALIZADO (padronização de nomenclatura)
-- 1. Inserir novo código REALIZADO
INSERT INTO "status_execucao" ("codigo", "descricao") VALUES ('REALIZADO', 'Realizado');

-- 2. Atualizar execuções que usam EXECUTADO para REALIZADO
UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO';

-- 3. Remover código antigo EXECUTADO
DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO';
