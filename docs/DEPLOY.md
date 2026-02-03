# Guia de Deploy - Sistema OCI SUS

## Deploy no Render (recomendado)

O projeto inclui `render.yaml` na raiz para deploy automático no [Render](https://render.com).

### Passo a passo

1. **Conecte o repositório ao Render**
   - Acesse [dashboard.render.com](https://dashboard.render.com)
   - Clique em **New > Web Service**
   - Conecte seu repositório GitHub/GitLab
   - O Render detectará o `render.yaml` automaticamente

2. **Configure as variáveis de ambiente** (Environment)
   - `DATABASE_URL` – URL de conexão do Neon (ex.: `postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`)
   - `JWT_SECRET` – String aleatória forte (ex.: `openssl rand -base64 32`)
   - `CLIENT_URL` – Opcional. URL do app (ex.: `https://sistema-oci-sus.onrender.com`). O Render define `RENDER_EXTERNAL_URL` automaticamente.

3. **Deploy**
   - O Render fará o build (`npm install`, `prisma generate`, `npm run build`)
   - Executará as migrações (`prisma migrate deploy`)
   - Iniciará o servidor (`npm start`)

4. **Após o primeiro deploy – executar seed (uma vez)**
   - Com o banco Neon já configurado, rode localmente:  
     `$env:DATABASE_URL="sua-url-neon"; npm run db:seed` (PowerShell)  
     ou defina `DATABASE_URL` no `.env` e execute `npm run db:seed`
   - Isso cria o usuário admin (`admin@oci.sus` / `admin123`) e dados iniciais
   - **Importante:** altere a senha do admin após o primeiro login

### Observações

- O frontend é servido pelo backend em produção (arquivos em `client/dist`)
- O banco Neon já está configurado; não é necessário criar Postgres no Render
- O plano free do Render coloca o serviço em sleep após ~15 min de inatividade; o primeiro acesso pode demorar ~30 s

---

## Preparação para Produção (deploy manual)

### 1. Variáveis de Ambiente

Configure todas as variáveis de ambiente no arquivo `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/oci_sus?schema=public"
JWT_SECRET="seu-secret-jwt-super-seguro-e-aleatorio-aqui"
PORT=3001
NODE_ENV=production
CLIENT_URL="https://seu-dominio.com"
```

⚠️ **Importante**: 
- Use um `JWT_SECRET` forte e aleatório em produção (o servidor **não inicia** se estiver ausente ou igual a `"secret"`)
- `DATABASE_URL` é obrigatório em produção (o servidor não inicia se estiver ausente)
- Configure `CLIENT_URL` com o domínio real do frontend
- Use SSL/TLS para o banco de dados em produção

**Segurança em produção (implementado):**
- **Helmet**: headers de segurança aplicados
- **Rate limit**: login limitado a 5 tentativas por IP a cada 15 min; API geral a 300 requisições por 15 min por IP
- **POST /api/auth/register**: desabilitado em produção (retorna 404). Cadastro de usuários apenas via menu Usuários (ADMIN)
- **POST /api/solicitacoes/verificar-prazos** e **POST /api/solicitacoes/:id/atualizar-alerta**: apenas perfil ADMIN. O job de prazos via cron executa o script diretamente (`node dist/jobs/verificar-prazos.job.js`), não a API, portanto não precisa de token

### 2. Build da Aplicação

```bash
# Build do backend
npm run build:server

# Build do frontend
npm run build:client
```

### 3. Executar Migrações

```bash
npm run db:generate
npm run db:migrate
```

### 4. Iniciar em Produção

```bash
npm start
```

## Configuração de Jobs Agendados

Para verificar prazos automaticamente, configure um cron job ou agendador de tarefas:

### Linux (crontab)

```bash
# Executar verificação de prazos a cada hora
0 * * * * cd /caminho/do/projeto && node dist/jobs/verificar-prazos.job.js
```

### Windows (Task Scheduler)

1. Abra o Agendador de Tarefas
2. Crie uma nova tarefa
3. Configure para executar:
   ```
   node dist/jobs/verificar-prazos.job.js
   ```
4. Configure para executar a cada hora

### Alternativa: Usar API

Você também pode chamar a API periodicamente:

```bash
# Via curl (exemplo)
curl -X POST http://localhost:3001/api/solicitacoes/verificar-prazos \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Deploy com PM2

Instale o PM2:

```bash
npm install -g pm2
```

Crie um arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'oci-backend',
    script: 'dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Inicie com PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Deploy do Frontend

### Opção 1: Servir arquivos estáticos

Após o build, os arquivos estarão em `client/dist/`. Você pode servir com:

- Nginx
- Apache
- Servidor estático (serve, etc)

### Opção 2: Integrar com backend

Configure o Express para servir os arquivos estáticos:

```javascript
// Adicione no server.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}
```

## Configuração de Nginx (Exemplo)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        root /caminho/do/projeto/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Segurança

### Checklist de Segurança

- [ ] `JWT_SECRET` forte e único
- [ ] Banco de dados com SSL/TLS
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Logs de segurança configurados
- [ ] Backup automático do banco de dados
- [ ] Firewall configurado
- [ ] Senhas de usuários alteradas (não usar admin123)

### Recomendações

1. **Backup**: Configure backup automático do PostgreSQL
2. **Monitoramento**: Configure logs e monitoramento
3. **Updates**: Mantenha dependências atualizadas
4. **SSL**: Use certificados SSL válidos
5. **Autenticação**: Implemente 2FA se necessário

## Monitoramento

### Logs

Configure rotação de logs:

```bash
# Exemplo com logrotate
/path/to/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

### Health Check

O sistema possui endpoint de health check:

```bash
GET /health
```

Use este endpoint para monitoramento.

## Escalabilidade

### Banco de Dados

- Configure connection pooling
- Considere read replicas para leitura
- Configure índices adequados (já configurados no schema)

### Aplicação

- Use PM2 em modo cluster
- Configure load balancer se necessário
- Cache de queries frequentes (Redis opcional)

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**: Verifique `DATABASE_URL` e firewall
2. **CORS errors**: Verifique `CLIENT_URL` no `.env`
3. **Build falha**: Verifique versão do Node.js (18+)
4. **Migrações falham**: Verifique permissões do usuário do banco
