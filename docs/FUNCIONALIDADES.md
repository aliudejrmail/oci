# Funcionalidades do Sistema OCI SUS

## Visão Geral

O Sistema de Gestão de OCI (Ofertas de Cuidados Integrados) foi desenvolvido para acompanhar e monitorar solicitações de procedimentos integrados no âmbito do Sistema Único de Saúde (SUS).

## Funcionalidades Principais

### 1. Gestão de Solicitações OCI

- **Criação de Solicitações**: Criar novas solicitações vinculadas a pacientes e OCIs específicas
- **Acompanhamento de Status**: Acompanhar o status das solicitações (Pendente, Em Andamento, Concluída, Vencida, Cancelada)
- **Gestão de Procedimentos**: Visualizar e atualizar o status de cada procedimento dentro de uma OCI
- **Busca e Filtros**: Buscar solicitações por protocolo, paciente, CPF, status ou tipo

### 2. Painel de Monitoramento (Dashboard)

- **Estatísticas Gerais**: 
  - Total de solicitações
  - Distribuição por status
  - Distribuição por tipo (Geral/Oncológico)
  
- **Indicadores de Desempenho**:
  - Taxa de conclusão
  - Tempo médio de conclusão
  
- **Gráficos**:
  - Evolução temporal (30 dias)
  - Distribuição por status

### 3. Sistema de Alertas de Prazos

- **Cálculo Automático**: Sistema calcula automaticamente os prazos baseado no tipo de OCI:
  - **Geral**: 60 dias
  - **Oncológico**: 30 dias

- **Níveis de Alerta**:
  - **INFO**: Mais de 20 dias restantes (geral) ou 10 dias (oncológico)
  - **ATENCAO**: Entre 10-20 dias restantes (geral) ou 5-10 dias (oncológico)
  - **CRITICO**: Menos de 10 dias restantes (geral) ou 5 dias (oncológico), ou vencido

- **Alertas no Dashboard**: Exibição de alertas críticos com informações sobre prazos vencidos ou próximos do vencimento

### 4. Gestão de Pacientes

- Cadastro de pacientes com informações completas
- Busca por nome ou CPF
- Visualização de histórico de solicitações por paciente

### 5. Catálogo de OCIs

- Visualização de todas as OCIs disponíveis
- Detalhes de cada OCI incluindo:
  - Código e nome
  - Tipo (Geral/Oncológico)
  - Prazo máximo
  - Lista de procedimentos incluídos
  - Quantidade de solicitações

### 6. Autenticação e Autorização

- Sistema de login com JWT
- Diferentes tipos de usuário (ADMIN, GESTOR, ATENDENTE)
- Proteção de rotas

## Fluxo de Trabalho

1. **Criação da Solicitação**:
   - Seleciona paciente (ou cria novo)
   - Seleciona OCI
   - Sistema gera protocolo único
   - Calcula data de prazo automaticamente
   - Cria execuções para cada procedimento da OCI

2. **Acompanhamento**:
   - Atualização de status dos procedimentos
   - Atualização de status da solicitação
   - Sistema atualiza alertas automaticamente

3. **Conclusão**:
   - Marca solicitação como concluída
   - Registra data de conclusão
   - Remove alertas

## Prazos e Alertas

### Cálculo de Prazos

- **Data de Solicitação**: Data em que a solicitação foi criada
- **Data de Prazo**: Calculada automaticamente:
  - Geral: Data de solicitação + 60 dias
  - Oncológico: Data de solicitação + 30 dias

### Verificação Automática

O sistema verifica automaticamente:
- Solicitações vencidas (marca como VENCIDA)
- Atualiza alertas de prazo
- Calcula dias restantes

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Criar usuário (dev)

### Solicitações
- `GET /api/solicitacoes` - Listar solicitações
- `GET /api/solicitacoes/:id` - Detalhes da solicitação
- `POST /api/solicitacoes` - Criar solicitação
- `PATCH /api/solicitacoes/:id/status` - Atualizar status
- `PATCH /api/solicitacoes/execucoes/:id` - Atualizar execução de procedimento

### Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas gerais
- `GET /api/dashboard/alertas` - Lista de alertas
- `GET /api/dashboard/proximas-vencimento` - Solicitações próximas do vencimento
- `GET /api/dashboard/evolucao-temporal` - Evolução temporal

### Pacientes
- `GET /api/pacientes` - Listar pacientes
- `GET /api/pacientes/:id` - Detalhes do paciente
- `POST /api/pacientes` - Criar paciente
- `PUT /api/pacientes/:id` - Atualizar paciente

### OCIs
- `GET /api/ocis` - Listar OCIs
- `GET /api/ocis/:id` - Detalhes da OCI
- `POST /api/ocis` - Criar OCI
- `PUT /api/ocis/:id` - Atualizar OCI
