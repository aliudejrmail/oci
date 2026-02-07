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

    // Verificar tamanho do arquivo
    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB < 1) {
      return res.status(400).json({
        message: `Arquivo muito pequeno (${tamanhoMB.toFixed(2)} MB). Tabelas SIGTAP válidas têm 20-50 MB. Verifique se o arquivo não está corrompido.`
      });
    }

    const zipPath = path.resolve(file.path);
    const cwd = process.cwd();
    
    // Usar script específico para produção com melhor tratamento de erros
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptName = isProduction ? 'importar-sigtap-zip-producao.ts' : 'importar-sigtap-zip.ts';
    const comando = `npx ts-node scripts/${scriptName} "${zipPath.replace(/\\/g, '/')}"`;

    try {
      const result = spawnSync(comando, {
        cwd,
        shell: true,
        encoding: 'utf8',
        maxBuffer: 15 * 1024 * 1024, // 15MB para logs extensos
        timeout: 25 * 60 * 1000      // 25 minutos para importações grandes
      });

      const saida = (result.stdout || '').trim();
      const erro = (result.stderr || '').trim();
      const log = saida + (erro ? '\n\nSTDERR:\n' + erro : '');

      if (result.status !== 0) {
        // Extrair mensagens de erro mais específicas
        let mensagemErro = 'Falha na importação SIGTAP.';
        
        if (saida.includes('Arquivo muito pequeno')) {
          mensagemErro = 'Arquivo muito pequeno. Verifique se é um ZIP válido da tabela SIGTAP.';
        } else if (saida.includes('tb_procedimento.txt não encontrado')) {
          mensagemErro = 'Arquivo ZIP não contém a estrutura esperada da tabela SIGTAP.';
        } else if (saida.includes('Erro ao extrair ZIP')) {
          mensagemErro = 'Arquivo ZIP corrompido ou inválido.';
        } else if (saida.includes('Não foi possível conectar ao banco')) {
          mensagemErro = 'Erro de conectividade com banco de dados. O banco pode estar hibernando, tente novamente em alguns minutos.';
        } else if (saida.includes("Can't reach database server")) {
          mensagemErro = 'Banco de dados inacessível. Verifique se o serviço Neon está ativo.';
        } else if (erro.includes('timeout') || saida.includes('timeout')) {
          mensagemErro = 'Timeout na importação. Tente novamente ou use um arquivo menor.';
        } else if (saida.includes('SIGTERM')) {
          mensagemErro = 'Processo interrompido por timeout. Importação pode levar até 20 minutos.';
        }
        
        return res.status(500).json({
          message: mensagemErro,
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
