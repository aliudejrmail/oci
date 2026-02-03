/**
 * Extrai um arquivo ZIP da tabela SIGTAP (por competência) e executa as importações:
 * 1) Procedimentos (tb_procedimento → procedimentos_sigtap)
 * 2) Compatibilidade CID/CBO (rl_* → compatibilidade_cid_sigtap, compatibilidade_cbo_sigtap)
 *
 * Uso:
 *   npm run importar:sigtap-zip
 *   npx ts-node scripts/importar-sigtap-zip.ts "tabelas/TabelaUnificada_202601_v2601221740.zip"
 *
 * O ZIP deve ser o arquivo baixado do SIGTAP (por competência). Após extração, a pasta
 * deve conter tb_procedimento.txt, rl_procedimento_cid.txt, rl_procedimento_ocupacao.txt, etc.
 */
import * as fs from 'fs'
import * as path from 'path'
import { spawnSync } from 'child_process'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip')

const TABELAS_DIR = 'tabelas'
const ARQUIVO_OBRIGATORIO = 'tb_procedimento.txt'

function encontrarPastaComTabelas(dir: string): string {
  if (fs.existsSync(path.join(dir, ARQUIVO_OBRIGATORIO))) {
    return dir
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(dir, e.name)
      if (fs.existsSync(path.join(sub, ARQUIVO_OBRIGATORIO))) {
        return sub
      }
      const deep = encontrarPastaComTabelas(sub)
      if (deep) return deep
    }
  }
  return ''
}

function main(): void {
  const cwd = process.cwd()
  const zipArg = process.argv[2]
  const zipPath = zipArg
    ? path.isAbsolute(zipArg)
      ? zipArg
      : path.join(cwd, zipArg)
    : path.join(cwd, TABELAS_DIR, 'TabelaUnificada_202601_v2601221740.zip')

  if (!fs.existsSync(zipPath)) {
    console.error('Arquivo ZIP não encontrado:', zipPath)
    console.error('Uso: npx ts-node scripts/importar-sigtap-zip.ts [caminho/para/arquivo.zip]')
    process.exit(1)
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  const extractDir = path.join(cwd, TABELAS_DIR, `Extraido_${timestamp}`)
  if (!fs.existsSync(path.join(cwd, TABELAS_DIR))) {
    fs.mkdirSync(path.join(cwd, TABELAS_DIR), { recursive: true })
  }

  console.log('=== Importação SIGTAP a partir de ZIP ===\n')
  console.log('ZIP:', zipPath)
  console.log('Extraindo em:', extractDir)

  try {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractDir, true)
    console.log('Extração concluída.\n')
  } catch (err: unknown) {
    console.error('Erro ao extrair ZIP:', (err as Error).message)
    process.exit(1)
  }

  const baseDir = encontrarPastaComTabelas(extractDir)
  if (!baseDir) {
    console.error('Pasta com tb_procedimento.txt não encontrada dentro de', extractDir)
    process.exit(1)
  }
  console.log('Pasta das tabelas:', baseDir, '\n')

  const comando1 = `npx ts-node scripts/importar-procedimentos-sigtap.ts "${baseDir.replace(/"/g, '\\"')}"`
  const comando2 = `npx ts-node scripts/importar-compatibilidade-oci-sigtap.ts "${baseDir.replace(/"/g, '\\"')}"`

  console.log('--- 1) Importando procedimentos (tb_procedimento → procedimentos_sigtap) ---')
  const run1 = spawnSync(comando1, {
    cwd,
    stdio: 'inherit',
    shell: true
  })
  if (run1.status !== 0) {
    console.error('Falha na importação de procedimentos. Código:', run1.status)
    process.exit(run1.status ?? 1)
  }

  console.log('\n--- 2) Importando compatibilidade CID/CBO (OCI) ---')
  const run2 = spawnSync(comando2, {
    cwd,
    stdio: 'inherit',
    shell: true
  })
  if (run2.status !== 0) {
    console.error('Falha na importação de compatibilidade. Código:', run2.status)
    process.exit(run2.status ?? 1)
  }

  console.log('\n=== Importação SIGTAP concluída com sucesso. ===')
}

main()
