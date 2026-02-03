import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Importar rotas
import solicitacoesRoutes from './routes/solicitacoes.routes';
import pacientesRoutes from './routes/pacientes.routes';
import ocisRoutes from './routes/ocis.routes';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import unidadesRoutes from './routes/unidades.routes';
import unidadesExecutantesRoutes from './routes/unidadesExecutantes.routes';
import profissionaisRoutes from './routes/profissionais.routes';
import usuariosRoutes from './routes/usuarios.routes';
import relatoriosRoutes from './routes/relatorios.routes';
import sigtapRoutes from './routes/sigtap.routes';

// Importar Prisma
import { prisma } from './database/prisma';

dotenv.config();

// Validação de variáveis obrigatórias em produção
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const faltando: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) faltando.push('DATABASE_URL');
  if (!process.env.JWT_SECRET?.trim() || process.env.JWT_SECRET === 'secret') {
    faltando.push('JWT_SECRET (use valor forte e aleatório)');
  }
  if (faltando.length > 0) {
    console.error('❌ Em produção as seguintes variáveis são obrigatórias:', faltando.join(', '));
    process.exit(1);
  }
}

const app = express();

// Headers de segurança (Helmet)
app.use(helmet({ contentSecurityPolicy: false })); // CSP desabilitado para compatibilidade com SPA; ajustar se necessário

// Rate limit geral para API (proteção contra abuso)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requisições por janela por IP
  message: { message: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 = aceita conexões de qualquer IP da rede

// Re-exportar prisma para compatibilidade
export { prisma };

// CORS: aceita localhost, CLIENT_URL e RENDER_EXTERNAL_URL (quando no Render)
const clientOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];
if (!clientOrigins.includes('http://localhost:5173')) clientOrigins.push('http://localhost:5173');
if (process.env.RENDER_EXTERNAL_URL && !clientOrigins.includes(process.env.RENDER_EXTERNAL_URL)) {
  clientOrigins.push(process.env.RENDER_EXTERNAL_URL);
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || clientOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check do banco (diagnóstico de erros 500)
app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'conectado' });
  } catch (error: any) {
    console.error('Health DB error:', error?.message, error?.code);
    res.status(500).json({
      status: 'erro',
      db: 'desconectado',
      message: error?.message,
      code: error?.code
    });
  }
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/solicitacoes', solicitacoesRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/ocis', ocisRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/unidades-executantes', unidadesExecutantesRoutes);
app.use('/api/profissionais', profissionaisRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/sigtap', sigtapRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Em produção: servir frontend estático (SPA) e fallback para index.html
if (isProduction) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler (erros que chegam via next(err) ou não capturados)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error handler:', err?.message || err);
  console.error(err?.stack);
  const code = err?.code;
  let message = err?.message || 'Erro interno do servidor';
  if (code === 'P1001') message = 'Não foi possível conectar ao banco de dados. Verifique se o PostgreSQL está rodando.';
  else if (code === 'P1002') message = 'Tempo esgotado ao conectar ao banco de dados.';
  else if (code === 'P1003') message = 'Banco de dados não encontrado. Verifique DATABASE_URL no .env.';
  else if (code === 'P1017') message = 'Conexão com o banco recusada. Verifique credenciais no .env.';
  else if (code === 'P2025') message = 'Registro não encontrado.';
  res.status(err.status || 500).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, code: err.code })
  });
});

// Testar conexão com banco ao iniciar
async function iniciarServidor() {
  try {
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conexão com banco de dados estabelecida');
    
    // Verificar se existem usuários
    const userCount = await prisma.usuario.count();
    if (userCount === 0) {
      console.log('⚠️  Nenhum usuário encontrado. Execute: npm run db:seed');
    } else {
      console.log(`✅ ${userCount} usuário(s) encontrado(s) no banco`);
    }
  } catch (error: any) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    if (error.code === 'P1001') {
      console.error('   → Verifique se o PostgreSQL está rodando');
    } else if (error.code === 'P1003') {
      console.error('   → Verifique se o banco de dados "oci_sus" existe');
    } else if (error.code === 'P1017') {
      console.error('   → Verifique as credenciais no arquivo .env');
    } else if (error.message?.includes('PrismaClient')) {
      console.error('   → Execute: npm run db:generate');
    }
  }

  // Iniciar servidor (0.0.0.0 = acessível pela rede via IP)
  app.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

iniciarServidor();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
