-- CreateTable: tabela auxiliar de status de execução de procedimento
CREATE TABLE "status_execucao" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "status_execucao_pkey" PRIMARY KEY ("codigo")
);

-- Inserir os status válidos
INSERT INTO "status_execucao" ("codigo", "descricao") VALUES
    ('PENDENTE', 'Pendente'),
    ('AGENDADO', 'Agendado'),
    ('EXECUTADO', 'Executado'),
    ('CANCELADO', 'Cancelado'),
    ('DISPENSADO', 'Dispensado');

-- Garantir que todos os valores existentes em execucoes_procedimentos.status sejam válidos
UPDATE "execucoes_procedimentos" SET "status" = 'PENDENTE' 
WHERE "status" NOT IN ('PENDENTE', 'AGENDADO', 'EXECUTADO', 'CANCELADO', 'DISPENSADO');

-- AddForeignKey: relacionar execucoes_procedimentos.status com status_execucao
ALTER TABLE "execucoes_procedimentos" ADD CONSTRAINT "execucoes_procedimentos_status_fkey" 
    FOREIGN KEY ("status") REFERENCES "status_execucao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
