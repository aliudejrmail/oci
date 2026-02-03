# Como subir o projeto para o GitHub

Execute os comandos abaixo no PowerShell, na pasta do projeto (`c:\projetos_web\oci`).

## Se o repositório ainda NÃO existe no GitHub

1. Crie um repositório em https://github.com/new
   - Nome: `oci`
   - Deixe vazio (sem README, .gitignore ou license)

## Comandos para executar

```powershell
cd c:\projetos_web\oci

# Inicializar Git (se ainda não tiver)
git init

# Adicionar o repositório remoto
git remote add origin https://github.com/aliudejrmail/oci.git

# Adicionar todos os arquivos (exceto os do .gitignore)
git add .

# Ver o que será commitado
git status

# Primeiro commit
git commit -m "Sistema OCI SUS - deploy inicial"

# Enviar para o GitHub (branch main)
git branch -M main
git push -u origin main
```

## Se o repositório JÁ existe e tem conteúdo

Se o GitHub já tiver commits, use:

```powershell
git pull origin main --allow-unrelated-histories
# Resolva conflitos se houver
git push -u origin main
```

## Autenticação

- Se pedir usuário/senha, use um **Personal Access Token** (PAT) no lugar da senha
- Crie em: GitHub → Settings → Developer settings → Personal access tokens
- Ou use: GitHub Desktop / Git Credential Manager
