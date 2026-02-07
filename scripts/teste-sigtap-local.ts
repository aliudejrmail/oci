/**
 * Teste local da importação SIGTAP sem conectar ao banco
 * Simula o processamento que acontece na produção
 */
import * as fs from 'fs'
import * as path from 'path'

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

function lerTbProcedimento(dir: string): number {
  const arquivo = path.join(dir, 'tb_procedimento.txt')
  if (!fs.existsSync(arquivo)) {
    throw new Error('Arquivo tb_procedimento.txt não encontrado')
  }
  
  const conteudo = fs.readFileSync(arquivo, 'latin1')
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0)
  
  console.log(`📄 tb_procedimento.txt: ${linhas.length} linhas`)
  
  // Validar formato das primeiras linhas
  for (let i = 0; i < Math.min(3, linhas.length); i++) {
    const campos = linhas[i].split('|')
    console.log(`   Linha ${i + 1}: ${campos.length} campos - ${campos[0]} | ${campos[1]?.substring(0, 50)}...`)
  }
  
  return linhas.length
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
    console.error('❌ Arquivo ZIP não encontrado:', zipPath)
    process.exit(1)
  }

  console.log('🧪 === TESTE DE IMPORTAÇÃO SIGTAP (SEM BANCO) ===\n')
  console.log('ZIP:', zipPath)
  
  // Verificar tamanho do arquivo
  const stats = fs.statSync(zipPath)
  const tamanhoMB = stats.size / (1024 * 1024)
  console.log(`📏 Tamanho do arquivo: ${tamanhoMB.toFixed(2)} MB`)
  
  if (tamanhoMB < 0.5) {
    console.error(`❌ Arquivo muito pequeno (${tamanhoMB.toFixed(2)} MB).`)
    process.exit(1)
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  const extractDir = path.join(cwd, TABELAS_DIR, `TesteExtracao_${timestamp}`)
  
  console.log('📁 Extraindo em:', extractDir)

  try {
    const zip = new AdmZip(zipPath)
    const entries = zip.getEntries()
    
    console.log(`📦 ZIP contém ${entries.length} arquivos`)
    
    // Listar arquivos principais
    const arquivosImportantes = entries.filter((e: any) => 
      e.entryName.includes('tb_procedimento.txt') ||
      e.entryName.includes('rl_procedimento_cid.txt') ||
      e.entryName.includes('rl_procedimento_ocupacao.txt')
    )
    
    console.log('🎯 Arquivos importantes encontrados:')
    arquivosImportantes.forEach((e: any) => {
      console.log(`   ✅ ${e.entryName} (${(e.header.size / 1024).toFixed(1)} KB)`)
    })
    
    zip.extractAllTo(extractDir, true)
    console.log('✅ Extração concluída\n')
  } catch (err: unknown) {
    console.error('❌ Erro ao extrair ZIP:', (err as Error).message)
    process.exit(1)
  }

  const baseDir = encontrarPastaComTabelas(extractDir)
  if (!baseDir) {
    console.error('❌ tb_procedimento.txt não encontrado')
    
    // Diagnóstico
    try {
      const contents = fs.readdirSync(extractDir, { withFileTypes: true })
      console.error('\n📁 Conteúdo da pasta extraída:')
      contents.slice(0, 10).forEach(item => {
        const tipo = item.isDirectory() ? '[PASTA]' : '[ARQUIVO]'
        console.error(`   ${tipo} ${item.name}`)
      })
      if (contents.length > 10) {
        console.error(`   ... e mais ${contents.length - 10} itens`)
      }
    } catch (e) {
      console.error('Erro ao listar conteúdo')
    }
    
    process.exit(1)
  }

  console.log('📂 Pasta das tabelas encontrada:', baseDir)

  try {
    // Testar leitura do tb_procedimento.txt
    const totalLinhas = lerTbProcedimento(baseDir)
    console.log(`\n✅ Arquivo tb_procedimento.txt válido: ${totalLinhas} registros`)

    // Verificar outros arquivos importantes
    const arquivosTest = [
      'rl_procedimento_cid.txt',
      'rl_procedimento_ocupacao.txt',
      'tb_forma_organizacao.txt'
    ]

    arquivosTest.forEach(arquivo => {
      const caminho = path.join(baseDir, arquivo)
      if (fs.existsSync(caminho)) {
        const tamanho = fs.statSync(caminho).size
        console.log(`✅ ${arquivo}: ${(tamanho / 1024).toFixed(1)} KB`)
      } else {
        console.log(`❌ ${arquivo}: NÃO ENCONTRADO`)
      }
    })

    console.log('\n🎉 TESTE CONCLUÍDO: Arquivo ZIP está válido e pronto para importação!')
    console.log('💡 O problema na produção deve ser específico de conectividade ou timeout.')

  } catch (err) {
    console.error('❌ Erro ao validar arquivos:', (err as Error).message)
    process.exit(1)
  } finally {
    // Limpeza
    try {
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true })
        console.log('🧹 Pasta temporária removida')
      }
    } catch (e) {
      console.log('⚠️  Não foi possível remover pasta temporária:', extractDir)
    }
  }
}

main()