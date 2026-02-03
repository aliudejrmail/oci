import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../database/prisma';
import { getJwtSecret } from '../utils/env';

const router = Router();

const TIPOS_PERMITIDOS = ['ADMIN', 'GESTOR', 'ATENDENTE', 'EXECUTANTE', 'AUTORIZADOR', 'SOLICITANTE'];

// Rate limit específico para login (proteção contra força bruta)
// Em desenvolvimento: limite alto para não bloquear testes. Em produção: 30 tentativas por 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 30 : 100,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
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

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
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

    return res.json({
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
