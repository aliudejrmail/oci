# Sistema de Gestão de OCI - Ofertas de Cuidados Integrados no SUS

Sistema web completo para acompanhamento e monitoramento de solicitações de procedimentos de OCI (Ofertas de Cuidados Integrados) no âmbito do Sistema Único de Saúde (SUS).

## 📋 Sobre o Projeto

Este sistema foi desenvolvido para atender às necessidades de gestão das Ofertas de Cuidados Integrados (OCI) no SUS, permitindo:

- Gestão completa do ciclo de vida das solicitações
- Monitoramento em tempo real de prazos e status
- Alertas automáticos sobre prazos vencidos ou próximos do vencimento
- Painel de indicadores e relatórios gerenciais
- Acompanhamento detalhado de cada procedimento dentro de uma OCI

## ✨ Funcionalidades Principais

- ✅ **Gestão de Solicitações**: Criação, acompanhamento e atualização de solicitações OCI
- ✅ **Painel de Monitoramento**: Dashboard com estatísticas, gráficos e indicadores
- ✅ **Sistema de Alertas**: Alertas automáticos sobre prazos (60 dias geral, 30 dias oncológico)
- ✅ **Gestão de Pacientes**: Cadastro e busca de pacientes
- ✅ **Catálogo de OCIs**: Visualização de todas as OCIs disponíveis
- ✅ **Acompanhamento de Procedimentos**: Status individual de cada procedimento
- ✅ **Relatórios**: Indicadores de desempenho e evolução temporal

## 🛠️ Tecnologias

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **UI**: Tailwind CSS + Lucide Icons
- **Gráficos**: Recharts

## 📦 Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- npm ou yarn

## 🚀 Instalação Rápida

Consulte o [Guia de Instalação Completo](docs/INSTALACAO.md) para instruções detalhadas.

### Passos Básicos:

1. **Instalar dependências**:
```bash
npm install
cd client && npm install && cd ..
```

2. **Configurar banco de dados**:
   - Criar banco PostgreSQL: `CREATE DATABASE oci_sus;`
   - Copiar `.env.example` para `.env` e configurar

3. **Executar migrações e seed**:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. **Iniciar aplicação**:
```bash
npm run dev
```

5. **Acessar**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001
   - Login padrão: `admin@oci.sus` / `admin123`

## � Estrutura do Projeto

```
oci/
├── src/                    # Backend (Node.js + Express)
│   ├── controllers/        # Controladores da API
│   ├── services/           # Lógica de negócio
│   ├── routes/             # Rotas da API
│   ├── middleware/         # Middlewares (auth, etc)
│   ├── utils/              # Utilitários
│   └── jobs/               # Jobs agendados
├── client/                 # Frontend (React + Vite)
│   └── src/
│       ├── components/     # Componentes React
│       ├── pages/          # Páginas da aplicação
│       ├── contexts/       # Contextos React
│       └── services/       # Serviços de API
├── prisma/                 # Schema e migrações
│   ├── schema.prisma       # Schema do banco
│   └── seed.ts            # Dados iniciais
├── docs/                   # Documentação
└── dist/                   # Build do backend
```

## 📚 Documentação

- [Guia de Instalação](docs/INSTALACAO.md) - Instruções detalhadas de instalação
- [Funcionalidades](docs/FUNCIONALIDADES.md) - Descrição completa das funcionalidades

## 🔑 Credenciais Padrão

Após executar o seed:
- **Email**: admin@oci.sus
- **Senha**: admin123

⚠️ **Importante**: Altere essas credenciais em produção!

## 🎯 Principais Comandos

```bash
# Desenvolvimento
npm run dev                 # Inicia backend e frontend
npm run dev:server          # Apenas backend
npm run dev:client          # Apenas frontend

# Build
npm run build               # Build completo

# Banco de dados
npm run db:generate         # Gerar cliente Prisma
npm run db:migrate          # Executar migrações
npm run db:seed            # Popular banco
npm run db:studio          # Abrir Prisma Studio

# Produção
npm start                   # Inicia servidor
```

## 🔔 Sistema de Alertas

O sistema calcula automaticamente os prazos:
- **OCI Geral**: 60 dias
- **OCI Oncológico**: 30 dias

Níveis de alerta:
- **INFO**: Prazo adequado
- **ATENCAO**: Prazo próximo (10-20 dias geral, 5-10 oncológico)
- **CRITICO**: Prazo muito próximo ou vencido (<10 dias geral, <5 oncológico)

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Criar usuário

### Solicitações
- `GET /api/solicitacoes` - Listar
- `GET /api/solicitacoes/:id` - Detalhes
- `POST /api/solicitacoes` - Criar
- `PATCH /api/solicitacoes/:id/status` - Atualizar status

### Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas
- `GET /api/dashboard/alertas` - Alertas
- `GET /api/dashboard/evolucao-temporal` - Evolução

Consulte a documentação completa em [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md)

## 🤝 Contribuindo

Este é um projeto de sistema de gestão para o SUS. Para contribuições, siga as boas práticas de desenvolvimento e mantenha a documentação atualizada.

## 📝 Licença

ISC

## 🆘 Suporte

Para problemas ou dúvidas, consulte a documentação em `docs/` ou verifique os logs do sistema.
