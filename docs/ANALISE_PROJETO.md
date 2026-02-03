# Análise Completa do Projeto – Sistema OCI SUS

Este documento apresenta uma análise das funcionalidades, segurança, layout/UX, qualidade de código e infraestrutura do sistema.

> **Atualização:** As soluções para os riscos e melhorias listados abaixo foram implementadas (validação de env em produção, register desabilitado em produção, rate limit, helmet, restrição de rotas verificar-prazos/atualizar-alerta a ADMIN, validação com express-validator nas rotas de auth). Ver `docs/DEPLOY.md` para detalhes de segurança em produção.

---

## 1. Funcionalidades

### 1.1 Visão geral

O sistema cobre o fluxo de **gestão de Ofertas de Cuidados Integrados (OCI)** no SUS:

- **Solicitações OCI**: criação, listagem, filtros, detalhes, edição, exclusão, anexos, agendamento/reagendamento de procedimentos, registro de execução, autorização APAC.
- **Dashboard**: estatísticas, alertas de prazos, evolução temporal, notificações Autorizador, APACs e procedimentos próximos do vencimento.
- **Pacientes, Profissionais, OCIs, Unidades (executantes/solicitantes), Usuários**: CRUD e listagens com permissões por perfil.
- **Perfis**: ADMIN, GESTOR, ATENDENTE, EXECUTANTE, AUTORIZADOR, SOLICITANTE, com menu e rotas diferenciados.

### 1.2 Pontos fortes

- Domínio bem modelado (solicitações, execuções, prazos, APAC, competências).
- Regras de negócio implementadas (prazos por tipo de OCI, biópsia, consulta especializada, procedimentos secundários obrigatórios).
- Filtro por perfil Executante (por unidade ou por usuário) e controle de acesso no detalhe da solicitação.
- Documentação em `docs/` (instalação, deploy, funcionalidades, APAC, SIGTAP).
- Scripts de importação e validação (SIGTAP, OCIs, agendamentos).

### 1.3 Lacunas / melhorias

- **POST /api/auth/register** está público: em produção deve ser desativado ou protegido (ex.: só ADMIN ou só em ambiente de desenvolvimento).
- **express-validator** está no `package.json` mas não é usado: validações são manuais (trim, length). Vale padronizar com validação centralizada nas rotas.
- **Testes automatizados**: não há testes unitários/integração no código do projeto (apenas em dependências). Recomenda-se adicionar testes para serviços críticos (solicitações, prazos, auth).
- **POST /api/solicitacoes/verificar-prazos** e **POST /api/solicitacoes/:id/atualizar-alerta** estão acessíveis a qualquer usuário autenticado; em produção pode ser desejável restringir a um cron/serviço ou a ADMIN.

---

## 2. Segurança

### 2.1 Pontos fortes

- **Autenticação**: JWT com `userId` e `tipo`; senhas com bcrypt (hash ao criar/atualizar).
- **Autorização**: middleware `authenticate` em rotas sensíveis; `requireRole` para ADMIN, GESTOR, etc., alinhado ao frontend (ProtectedRoute por roles).
- **CORS**: configurado por `CLIENT_URL`, com fallback para localhost; `credentials: true` para cookies se no futuro for usado.
- **Upload**: apenas PDF; limite de tamanho (10 MB) e quantidade (10 arquivos); `fileFilter` no multer.
- **Prisma**: uso de ORM evita SQL injection nas queries normais.
- **Resposta de login**: não expõe senha; retorna apenas `id`, `nome`, `email`, `tipo`, `unidadeExecutante`.
- **Download de anexo**: usa ID da solicitação e do anexo; caminho montado no servidor a partir do banco, reduzindo path traversal se o dado no banco for controlado.

### 2.2 Riscos e recomendações

| Item | Risco | Recomendação |
|------|--------|--------------|
| **JWT_SECRET** | Em `auth.routes.ts` há fallback `process.env.JWT_SECRET \|\| 'secret'`. Em produção um secret fraco ou padrão compromete todos os tokens. | Exigir `JWT_SECRET` em produção (validar no startup) e usar valor forte e aleatório. |
| **POST /auth/register** | Aberto para qualquer um criar usuário. | Desabilitar em produção ou proteger (ex.: só ADMIN) e validar `tipo` (evitar criar ADMIN por fora). |
| **Rate limiting** | Não há limite de requisições por IP/usuário. | Adicionar `express-rate-limit` (e.g. em `/api/auth/login` e nas APIs sensíveis) para mitigar força bruta e abuso. |
| **Headers de segurança** | Não há `helmet`. | Usar `helmet()` para definir headers (X-Content-Type-Options, X-Frame-Options, etc.) em produção. |
| **Sanitização/XSS** | Dados são exibidos no frontend (React escapa por padrão). Backend não sanitiza entradas antes de persistir. | Manter React para escape; em backend validar/comprimir entradas (tamanho, tipo) e, se gerar HTML, usar lib de sanitização. |
| **Token no frontend** | Token em `localStorage`; interceptor envia no header. | Aceitável para SPA; em cenários de maior risco considerar httpOnly cookie + CSRF. |
| **Logout em 401** | Interceptor do axios remove token e redireciona para `/login`. | Bom para expiração/revogação; garantir que mensagens de erro não vazem dados sensíveis. |

---

## 3. Layout e UX

### 3.1 Pontos fortes

- **Layout**: sidebar fixa com menu por perfil (Dashboard, Solicitações, Pacientes, Profissionais, OCIs, Unidades, Usuários), identidade “Sec. Municipal de Saúde – Prefeitura de Parauapebas” e área de conteúdo com `<Outlet />`.
- **Consistência**: Tailwind com paleta `primary` (tons de azul); botões, cards e inputs seguem o mesmo padrão.
- **Login**: tela centralizada, gradiente suave, ícone e título claros; feedback de erro e loading.
- **Navegação**: menu destaca rota ativa; EXECUTANTE vê só Solicitações; ADMIN vê tudo incluindo Usuários.
- **Responsividade**: uso de `max-w-md`, `w-full`, grid e flex; sidebar fixa em 64 (w-64). Em telas muito pequenas a sidebar pode ocupar boa parte da tela – vale testar breakpoint (ex.: menu colapsável em mobile).
- **Feedback**: loading em listagens e botões; mensagens de erro (ex.: “Não foi possível carregar”); aviso para Executante sem unidade vinculada na lista de solicitações.

### 3.2 Melhorias sugeridas

- **Acessibilidade**: adicionar `aria-label` em ícones e botões sem texto; garantir contraste (ex.: primary-600 em fundo branco); ordem de foco e suporte a teclado em modais.
- **Mobile**: considerar menu hambúrguer e drawer para a sidebar em viewports pequenos.
- **Estados vazios**: telas com “Nenhum item” poderiam ter ilustração ou CTA (ex.: “Criar primeira solicitação”).
- **Paginação**: listagens usam backend paginado; conferir se o frontend exibe “Página X de Y” e navegação quando houver muitas páginas.

---

## 4. Qualidade de Código e Arquitetura

### 4.1 Pontos fortes

- **Backend**: divisão em routes → controllers → services; Prisma para persistência; regras de negócio concentradas nos services (ex.: `solicitacoes.service.ts`).
- **Frontend**: React com rotas por componente; contexto de autenticação; API centralizada em `api.ts` com interceptors para token e 401.
- **Tipagem**: TypeScript no backend e no client; interfaces para usuário, solicitação, etc.
- **Ambiente**: `.env.example` e documentação de variáveis; `NODE_ENV` usado para mensagens de erro e stack trace.
- **Graceful shutdown**: SIGINT/SIGTERM desconectam o Prisma antes de encerrar.

### 4.2 Melhorias sugeridas

- **Tratamento de erros**: em vários pontos usa `error: any` e `error?.message`; padronizar tipo (ex.: `AppError`) e respostas de API (código, message, opcionalmente correlationId).
- **Logs**: após higienização, restam principalmente `console.error` em catches; em produção considerar logger (ex.: pino/winston) com níveis e formato estruturado.
- **Tamanho de arquivos**: alguns arquivos (ex.: `solicitacoes.service.ts`, `SolicitacaoDetalhes.tsx`) são grandes; extrair helpers, hooks ou subcomponentes melhora leitura e testes.
- **Dependência não usada**: `express-validator` está no package.json e não é referenciada no código; remover ou passar a usar em rotas de criação/atualização.

---

## 5. Infraestrutura e Deploy

### 5.1 Pontos fortes

- **Banco**: PostgreSQL com Prisma; migrations e seed documentados; scripts de importação (SIGTAP, OCIs).
- **Health**: `/health` e `/api/health/db` para monitoramento.
- **Deploy**: `docs/DEPLOY.md` com variáveis, build, migrações, PM2 e cron para verificação de prazos.
- **Build**: scripts separados para backend (`build:server`) e frontend (`build:client`); `npm run build` executa ambos.

### 5.2 Melhorias sugeridas

- **Variáveis obrigatórias**: no startup, checar presença de `DATABASE_URL` e `JWT_SECRET` em produção e falhar cedo se ausentes.
- **Cron**: o job de prazos está em `jobs/verificar-prazos.job.ts`; o deploy descreve execução externa (cron/PM2); garantir que em produção esse job rode na periodicidade desejada.
- **Uploads**: pasta `uploads/` deve estar no `.gitignore` e backup/limpeza devem ser considerados em produção.

---

## 6. Resumo e Prioridades

| Área | Nota resumida | Prioridade alta |
|------|----------------|------------------|
| **Funcionalidades** | Atende ao fluxo OCI, perfis e regras de negócio. | Desativar ou proteger `/auth/register` em produção. |
| **Segurança** | Auth e autorização sólidas; CORS e upload controlados. | JWT_SECRET obrigatório e forte em produção; rate limit (login); helmet. |
| **Layout/UX** | Layout claro, menu por perfil, feedback básico. | Ajustes para mobile e acessibilidade. |
| **Código** | Estrutura clara, TypeScript, documentação. | Testes; remover ou usar express-validator; padronizar erros e logs. |
| **Infra** | Prisma, health, deploy documentado. | Validar env em produção; garantir execução do job de prazos. |

O projeto está em bom estado para uso interno/municipal, com evolução focada em segurança de produção (JWT, register, rate limit, helmet), testes e refinamentos de UX e código.
