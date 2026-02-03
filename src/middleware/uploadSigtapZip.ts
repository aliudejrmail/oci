import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

interface MulterFileLike {
  originalname: string;
  mimetype?: string;
}

const MAX_SIZE_MB = 150;
const TABELAS_DIR = path.join(process.cwd(), 'tabelas');

if (!fs.existsSync(TABELAS_DIR)) {
  fs.mkdirSync(TABELAS_DIR, { recursive: true });
}

export const uploadSigtapZip = multer({
  storage: multer.diskStorage({
    destination: (_req: Request, _file: MulterFileLike, cb: (error: Error | null, destination: string) => void) => {
      cb(null, TABELAS_DIR);
    },
    filename: (_req: Request, file: MulterFileLike, cb: (error: Error | null, filename: string) => void) => {
      const ext = path.extname(file.originalname)?.toLowerCase() === '.zip' ? '.zip' : '.zip';
      const base = `Importacao_${Date.now()}`;
      cb(null, `${base}${ext}`);
    }
  }),
  fileFilter: (_req: Request, file: MulterFileLike, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname)?.toLowerCase();
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .zip são permitidos (tabela SIGTAP por competência).'));
    }
  },
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 }
}).single('arquivo');
