import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const MAX_SIZE_MB = 10;
const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'solicitacoes');

export const uploadAnexos = multer({
  storage: multer.diskStorage({
    destination: (req: Request, _file, cb: (error: Error | null, destination: string) => void) => {
      const id = (req.params as { id?: string }).id;
      if (!id) {
        cb(new Error('ID da solicitação não informado'), '');
        return;
      }
      const dir = path.join(UPLOAD_BASE, id);
      try {
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      } catch (e) {
        cb(e as Error, dir);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)?.toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
      const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `${base}${ext}`);
    }
  }),
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      (req as any).fileValidationError = 'Apenas arquivos PDF são permitidos';
      cb(null, false);
    }
  },
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 }
}).array('anexos', 10);
