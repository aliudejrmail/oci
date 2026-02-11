import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env';

export interface AuthRequest extends Request {
  userId?: string;
  userTipo?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    // Prioridade: Cookie > Header
    const token = (req as any).cookies?.token || authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { userId: string; tipo: string };
    req.userId = decoded.userId;
    req.userTipo = decoded.tipo;

    return next();
  } catch (error: any) {
    if (error.message === 'JWT_SECRET não configurado') {
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }
    console.error('❌ Erro na autenticação:', error.message);
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userTipo || !roles.includes(req.userTipo)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    return next();
  };
};
