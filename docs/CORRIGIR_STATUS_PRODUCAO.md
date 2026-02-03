# Corrigir FK violation (status_execucao) em Produção

Quando o erro **"Foreign key constraint violated: execucoes_procedimentos_status_fkey"** aparece ao registrar procedimentos, o banco de produção precisa da correção.

## Passo 1: Obter a DATABASE_URL de produção

1. Acesse o [Dashboard do Render](https://dashboard.render.com)
2. Selecione o serviço **sistema-oci-sus**
3. Vá em **Environment** e copie o valor de `DATABASE_URL`

## Passo 2: Executar o script localmente

No PowerShell, na pasta do projeto:

```powershell
# Substitua pela URL real do Render (começa com postgresql://)
$env:DATABASE_URL="postgresql://usuario:senha@host/db?sslmode=require"
npm run corrigir:status-execucao
```

## Passo 3: Alternativa – SQL direto no console do banco

Se preferir, execute no **Neon Console** ou **pgAdmin** conectado ao banco de produção:

```sql
INSERT INTO "status_execucao" ("codigo", "descricao")
VALUES ('REALIZADO', 'Realizado')
ON CONFLICT ("codigo") DO NOTHING;

UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO';

DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO';
```

## Verificação

Após a correção, os status em `status_execucao` devem ser:
**AGENDADO, CANCELADO, DISPENSADO, PENDENTE, REALIZADO**
