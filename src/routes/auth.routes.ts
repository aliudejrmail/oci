import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../database/prisma';
import { getJwtSecret } from '../utils/env';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const TIPOS_PERMITIDOS = ['ADMIN', 'GESTOR', 'ATENDENTE', 'EXECUTANTE', 'AUTORIZADOR', 'SOLICITANTE'];

// Rate limit específico para login (proteção contra força bruta)
// Em desenvolvimento: limite alto para não bloquear testes. Em produção: 30 tentativas por 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite de 5 tentativas FALHAS
  skipSuccessfulRequests: true, // Login com sucesso não queima ficha
  message: { message: 'Muitas tentativas de login incorretas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validação e sanitização para login
const validarLogin = [
  body('email').trim().notEmpty().withMessage('Email é obrigatório').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('senha').notEmpty().withMessage('Senha é obrigatória')
];

// Validação para register
const validarRegister = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório').isLength({ max: 200 }).withMessage('Nome muito longo'),
  body('email').trim().notEmpty().withMessage('Email é obrigatório').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('senha').trim().notEmpty().withMessage('Senha é obrigatória').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('tipo').trim().notEmpty().withMessage('Tipo é obrigatório').isIn(TIPOS_PERMITIDOS).withMessage('Tipo de usuário inválido')
];

// Login
router.post('/login', loginLimiter, validarLogin, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map((e) => e.msg).join('. ');
      return res.status(400).json({ message: msg });
    }

    const { email, senha } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        unidade: { select: { id: true, cnes: true, nome: true } },
        unidadeExecutante: { select: { id: true, cnes: true, nome: true } }
      }
    });

    if (!usuario) {
      // Retornar erro genérico para não enumerar usuários
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar se está bloqueado
    if ((usuario as any).bloqueadoEm) {
      return res.status(403).json({
        message: 'Conta bloqueada devido a excesso de tentativas. Contate um administrador ou gestor para desbloqueio.'
      });
    }

    if (!usuario.ativo) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      // Incrementar tentativas
      const tentativas = (usuario.tentativasLogin || 0) + 1;
      let updateData: any = { tentativasLogin: tentativas };

      // Bloquear se atingir 5 tentativas
      if (tentativas >= 5) {
        updateData.bloqueadoEm = new Date();
      }

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: updateData
      });

      if (tentativas >= 5) {
        return res.status(403).json({
          message: 'Conta bloqueada devido a excesso de tentativas. Contate um administrador ou gestor para desbloqueio.'
        });
      }

      const tentativasRestantes = 5 - tentativas;
      return res.status(401).json({
        message: `Credenciais inválidas. Restam ${tentativasRestantes} tentativas antes do bloqueio.`
      });
    }

    // Login com sucesso: Resetar contador e bloqueio (se houver resquício, embora bloqueado não passe aqui, garante limpeza)
    if ((usuario.tentativasLogin || 0) > 0 || usuario.bloqueadoEm) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { tentativasLogin: 0, bloqueadoEm: null }
      });
      // Atualiza objeto local para retorno correto (opcional, mas boa prática)
      usuario.tentativasLogin = 0;
      usuario.bloqueadoEm = null;
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo
      },
      secret,
      { expiresIn: '24h' }
    );

    // Configurar cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS em produção
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    return res.json({
      // Token ainda retornado no corpo por compatibilidade (opcional), mas o cookie é o principal
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        unidadeId: usuario.unidadeId ?? null,
        unidade: usuario.unidade
          ? { id: usuario.unidade.id, cnes: usuario.unidade.cnes, nome: usuario.unidade.nome }
          : null,
        unidadeExecutanteId: usuario.unidadeExecutanteId ?? null,
        unidadeExecutante: usuario.unidadeExecutante
          ? { id: usuario.unidadeExecutante.id, cnes: usuario.unidadeExecutante.cnes, nome: usuario.unidadeExecutante.nome }
          : null
      }
    });
  } catch (error: any) {
    if (error.message === 'JWT_SECRET não configurado') {
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }
    console.error('Erro no login:', error);
    return res.status(500).json({
      message: error.message || 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        code: error.code
      })
    });
  }
});

// Logout (Limpar cookie)
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logout realizado com sucesso' });
});

// Verificar sessão (Me)
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: (req as any).userId },
      include: {
        unidade: { select: { id: true, cnes: true, nome: true } },
        unidadeExecutante: { select: { id: true, cnes: true, nome: true } }
      }
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      unidadeId: usuario.unidadeId ?? null,
      unidade: usuario.unidade
        ? { id: usuario.unidade.id, cnes: usuario.unidade.cnes, nome: usuario.unidade.nome }
        : null,
      unidadeExecutanteId: usuario.unidadeExecutanteId ?? null,
      unidadeExecutante: usuario.unidadeExecutante
        ? { id: usuario.unidadeExecutante.id, cnes: usuario.unidadeExecutante.cnes, nome: usuario.unidadeExecutante.nome }
        : null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});

// Criar usuário: em produção desabilitado (uso apenas via cadastro de usuários por ADMIN)
router.post('/register', validarRegister, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Rota não disponível' });
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map((e) => e.msg).join('. ');
      return res.status(400).json({ message: msg });
    }

    const { nome, email, senha, tipo } = req.body;

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        tipo
      }
    });

    return res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    return res.status(500).json({ message: error.message });
  }
});

export default router;
