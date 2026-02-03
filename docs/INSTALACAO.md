# Guia de Instalação - Sistema OCI SUS

## Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- npm ou yarn

## Passo a Passo

### 1. Clone o repositório (se aplicável)

```bash
cd c:\projetos_web\oci
```

### 2. Instale as dependências

```bash
# Instalar dependências do backend
npm install

# Instalar dependências do frontend
cd client
npm install
cd ..
```

### 3. Configure o banco de dados PostgreSQL

Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE oci_sus;
```

### 4. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
copy .env.example .env
```

Edite o arquivo `.env` e configure:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/oci_sus?schema=public"
JWT_SECRET="seu-secret-jwt-super-seguro-aqui"
PORT=3001
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
```

### 5. Execute as migrações do banco de dados

```bash
# Gerar o cliente Prisma
npm run db:generate

# Executar migrações
npm run db:migrate

# Popular banco com dados iniciais
npm run db:seed
```

### 6. Inicie o servidor de desenvolvimento

```bash
# Inicia backend e frontend simultaneamente
npm run dev
```

Ou inicie separadamente:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### 7. Acesse a aplicação

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Prisma Studio (opcional): `npm run db:studio`

### 8. Acesso pela rede (via IP)

Para que outros dispositivos na mesma rede acessem o sistema pelo IP do computador:

1. **Descubra o IP da máquina** onde o servidor está rodando:
   - Windows (PowerShell): `Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }`
   - Ou em Configurações > Rede e Internet > Propriedades do Wi‑Fi/Ethernet.

2. **No arquivo `.env`** (na raiz do projeto), adicione a URL do frontend com o IP ao CORS:
   ```env
   CLIENT_URL="http://localhost:5173,http://SEU_IP:5173"
   ```
   Substitua `SEU_IP` pelo IP real (ex.: `192.168.1.100`).

3. **Reinicie o backend** após alterar o `.env`.

4. **Acesso**: Em outro computador ou celular na mesma rede, abra no navegador:
   ```
   http://SEU_IP:5173
   ```

O frontend (Vite) já está configurado para aceitar conexões de qualquer interface (`host: true`). O backend escuta em `0.0.0.0`, aceitando conexões de qualquer IP da rede.

**Firewall**: Se não conseguir acessar, libere as portas **5173** (frontend) e **3001** (API) no firewall do Windows.

## Credenciais Padrão

Após executar o seed, você pode fazer login com:

- **Email**: admin@oci.sus
- **Senha**: admin123

## Estrutura do Projeto

```
oci/
├── src/                    # Código fonte do backend
│   ├── controllers/        # Controladores da API
│   ├── services/           # Lógica de negócio
│   ├── routes/             # Rotas da API
│   ├── middleware/         # Middlewares (auth, etc)
│   └── utils/              # Utilitários
├── client/                 # Aplicação React frontend
│   └── src/
│       ├── components/     # Componentes React
│       ├── pages/          # Páginas da aplicação
│       ├── contexts/       # Contextos React
│       └── services/       # Serviços de API
├── prisma/                 # Schema e migrações do Prisma
└── docs/                   # Documentação
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Inicia backend e frontend
npm run dev:server          # Apenas backend
npm run dev:client          # Apenas frontend

# Build
npm run build               # Build completo
npm run build:server        # Build do backend
npm run build:client       # Build do frontend

# Banco de dados
npm run db:generate         # Gerar cliente Prisma
npm run db:migrate          # Executar migrações
npm run db:seed             # Popular banco com dados iniciais
npm run db:studio           # Abrir Prisma Studio

# Produção
npm start                   # Inicia servidor em produção
```

## Solução de Problemas

### Erro de conexão com banco de dados

Verifique se:
- PostgreSQL está rodando
- As credenciais no `.env` estão corretas
- O banco de dados foi criado

### Erro ao executar migrações

Certifique-se de que:
- O Prisma Client foi gerado (`npm run db:generate`)
- O banco de dados existe
- As permissões do usuário estão corretas

### Porta já em uso

Altere a porta no arquivo `.env` ou pare o processo que está usando a porta.
