import { Request, Response } from 'express';
import { spawnSync } from 'child_process';
import path from 'path';

/**
 * Executa a importação SIGTAP a partir do ZIP enviado.
 * Requer: upload do arquivo .zip (multer) e perfil ADMIN.
 */
export class SigtapController {
  async importar(req: Request, res: Response) {
    const file = (req as any).file;
    if (!file?.path) {
      return res.status(400).json({
        message: 'Nenhum arquivo enviado. Envie um arquivo .zip da tabela SIGTAP (por competência).'
      });
    }

    const zipPath = path.resolve(file.path);
    const cwd = process.cwd();
    const comando = `npx ts-node scripts/importar-sigtap-zip.ts "${zipPath.replace(/\\/g, '/')}"`;

    try {
      const result = spawnSync(comando, {
        cwd,
        shell: true,
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 10 * 60 * 1000
      });

      const saida = (result.stdout || '').trim();
      const erro = (result.stderr || '').trim();
      const log = saida + (erro ? '\n\nSTDERR:\n' + erro : '');

      if (result.status !== 0) {
        return res.status(500).json({
          message: 'Falha na importação SIGTAP. Verifique o log.',
          log: log || (result.error?.message ?? 'Erro desconhecido'),
          status: result.status
        });
      }

      return res.json({
        message: 'Importação SIGTAP concluída com sucesso.',
        log: log || 'Procedimentos e compatibilidade CID/CBO importados.'
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao executar importação.';
      return res.status(500).json({ message, log: '' });
    }
  }
}
