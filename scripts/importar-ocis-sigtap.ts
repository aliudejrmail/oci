/**
 * Importa OCIs e procedimentos a partir da tabela SIGTAP (grupo 09 - Ofertas de Cuidados Integrados).
 * Lê tb_procedimento.txt e tb_forma_organizacao.txt, agrupa procedimentos por forma (090101, 090201, etc.)
 * e cria/atualiza Oci e ProcedimentoOci com códigos e nomes da tabela SIGTAP.
 *
 * Pré-requisito: tabela compacta SIGTAP extraída em tabelas/TabelaUnificada_202601_v2601221740 (ou informar pasta).
 *
 * Uso:
 *   npx ts-node scripts/importar-ocis-sigtap.ts
 *   npx ts-node scripts/importar-ocis-sigtap.ts "tabelas/TabelaUnificada_202601_v2601221740"
 *   npx ts-node scripts/importar-ocis-sigtap.ts --json=data/ocis-planilha.json
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const ENCODING = 'latin1' as BufferEncoding
const PREFIXO_OCI = '09'
const FORMA_ONCO = '090101' // OCI Oncologia → prazo 30 dias, tipo ONCOLOGICO

type TipoOci = 'GERAL' | 'ONCOLOGICO'
type TipoProcedimento = 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO_CIRURGICO' | 'TECNOLOGIA' | 'OUTRO'

interface ProcedimentoSigtapLinha {
  codigo: string
  nome: string
  forma: string // primeiros 6 caracteres do código
}

interface FormaOrganizacao {
  codigo: string // 6 chars: 090101, 090201, ...
  nome: string
}

function lerTbFormaOrganizacao(dir: string): FormaOrganizacao[] {
  const p = path.join(dir, 'tb_forma_organizacao.txt')
  if (!fs.existsSync(p)) return []
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const out: FormaOrganizacao[] = []
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 106) continue
    const codigo = line.slice(0, 6).trim()
    const nome = line.slice(6, 106).trim()
    if (codigo.startsWith(PREFIXO_OCI)) out.push({ codigo, nome })
  }
  return out
}

function lerProcedimentosOci(dir: string): ProcedimentoSigtapLinha[] {
  const p = path.join(dir, 'tb_procedimento.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const linhas = buf.split(/\r?\n/).filter((l) => l.length >= 260)
  return linhas
    .map((line) => {
      const codigo = line.slice(0, 10).trim()
      const nome = line.slice(10, 260).trim()
      if (!codigo.startsWith(PREFIXO_OCI) || !nome) return null
      return {
        codigo,
        nome,
        forma: codigo.slice(0, 6)
      }
    })
    .filter((r): r is ProcedimentoSigtapLinha => r !== null)
}

function inferirTipoProcedimento(nome: string): TipoProcedimento {
  const n = nome.toUpperCase()
  if (n.includes('CONSULTA')) return 'CONSULTA'
  if (n.includes('EXAME') || n.includes('DIAGN') || n.includes('AVALIA')) return 'EXAME'
  return 'EXAME'
}

async function importarDesdeSigtap(baseDir: string, prisma: PrismaClient) {
  const formas = lerTbFormaOrganizacao(baseDir)
  const procedimentos = lerProcedimentosOci(baseDir)
  const mapaForma = new Map(formas.map((f) => [f.codigo, f]))

  const porForma = new Map<string, ProcedimentoSigtapLinha[]>()
  for (const p of procedimentos) {
    const lista = porForma.get(p.forma) ?? []
    lista.push(p)
    porForma.set(p.forma, lista)
  }

  let ocisCriadas = 0
  let procedimentosCriados = 0

  for (const [formaCodigo, procs] of porForma) {
    const forma = mapaForma.get(formaCodigo)
    const nomeOci = forma?.nome ?? `OCI Forma ${formaCodigo}`
    const tipoOci: TipoOci = formaCodigo === FORMA_ONCO ? 'ONCOLOGICO' : 'GERAL'
    const prazoMaximoDias = tipoOci === 'ONCOLOGICO' ? 30 : 60

    const oci = await prisma.oci.upsert({
      where: { codigo: formaCodigo },
      update: {
        nome: nomeOci,
        tipo: tipoOci,
        prazoMaximoDias,
        descricao: `Importado da tabela SIGTAP - forma de organização ${formaCodigo}.`
      },
      create: {
        codigo: formaCodigo,
        nome: nomeOci,
        tipo: tipoOci,
        prazoMaximoDias,
        descricao: `Importado da tabela SIGTAP - forma de organização ${formaCodigo}.`
      }
    })
    ocisCriadas++

    let ordem = 1
    for (const proc of procs) {
      const existente = await prisma.procedimentoOci.findFirst({
        where: { ociId: oci.id, codigo: proc.codigo }
      })
      if (existente) {
        await prisma.procedimentoOci.update({
          where: { id: existente.id },
          data: {
            nome: proc.nome,
            codigoSigtap: proc.codigo,
            tipo: inferirTipoProcedimento(proc.nome),
            ordem
          }
        })
      } else {
        await prisma.procedimentoOci.create({
          data: {
            ociId: oci.id,
            codigo: proc.codigo,
            codigoSigtap: proc.codigo,
            nome: proc.nome,
            tipo: inferirTipoProcedimento(proc.nome),
            ordem,
            obrigatorio: true
          }
        })
      }
      procedimentosCriados++
      ordem++
    }
  }

  return { ocisCriadas, procedimentosCriados }
}

// --- Importação a partir de JSON (planilha/PDF convertido) ---

interface ProcedimentoPlanilha {
  codigoSigtap: string
  nome?: string
  tipo?: TipoProcedimento
  ordem?: number
  obrigatorio?: boolean
}

interface OciPlanilha {
  codigo: string
  nome: string
  descricao?: string
  tipo: TipoOci
  prazoMaximoDias: number
  procedimentos: ProcedimentoPlanilha[]
}

function carregarJsonOcis(caminho: string): OciPlanilha[] {
  const abs = path.isAbsolute(caminho) ? caminho : path.resolve(process.cwd(), caminho)
  if (!fs.existsSync(abs)) throw new Error(`Arquivo não encontrado: ${abs}`)
  const raw = fs.readFileSync(abs, 'utf-8')
  const data = JSON.parse(raw) as OciPlanilha[] | { ocis: OciPlanilha[] }
  return Array.isArray(data) ? data : data.ocis
}

async function importarDesdeJson(caminho: string, prisma: PrismaClient) {
  const ocis = carregarJsonOcis(caminho)
  let ocisCriadas = 0
  let procedimentosCriados = 0

  const tipoProcedimentoValidos: TipoProcedimento[] = ['CONSULTA', 'EXAME', 'PROCEDIMENTO_CIRURGICO', 'TECNOLOGIA', 'OUTRO']

  for (const o of ocis) {
    const oci = await prisma.oci.upsert({
      where: { codigo: o.codigo },
      update: {
        nome: o.nome,
        descricao: o.descricao ?? null,
        tipo: o.tipo,
        prazoMaximoDias: o.prazoMaximoDias
      },
      create: {
        codigo: o.codigo,
        nome: o.nome,
        descricao: o.descricao ?? null,
        tipo: o.tipo,
        prazoMaximoDias: o.prazoMaximoDias
      }
    })
    ocisCriadas++

    let ordem = 1
    for (const p of o.procedimentos) {
      const codigoSigtap = p.codigoSigtap.trim()
      if (!codigoSigtap) continue

      let nome = p.nome?.trim()
      if (!nome) {
        const sigtap = await prisma.procedimentoSigtap.findUnique({ where: { codigo: codigoSigtap } })
        nome = sigtap?.nome ?? codigoSigtap
      }

      const tipo = p.tipo && tipoProcedimentoValidos.includes(p.tipo) ? p.tipo : inferirTipoProcedimento(nome)
      const ordemProc = p.ordem ?? ordem
      const obrigatorio = p.obrigatorio ?? true

      const existente = await prisma.procedimentoOci.findFirst({
        where: { ociId: oci.id, codigo: codigoSigtap }
      })
      if (existente) {
        await prisma.procedimentoOci.update({
          where: { id: existente.id },
          data: { codigoSigtap, nome, tipo, ordem: ordemProc, obrigatorio }
        })
      } else {
        await prisma.procedimentoOci.create({
          data: {
            ociId: oci.id,
            codigo: codigoSigtap,
            codigoSigtap,
            nome,
            tipo,
            ordem: ordemProc,
            obrigatorio
          }
        })
      }
      procedimentosCriados++
      ordem++
    }
  }

  return { ocisCriadas, procedimentosCriados }
}

async function main() {
  const args = process.argv.slice(2)
  const jsonArg = args.find((a) => a.startsWith('--json='))
  const pastaArg = args.find((a) => !a.startsWith('--'))

  const prisma = new PrismaClient()

  try {
    if (jsonArg) {
      const caminho = jsonArg.replace('--json=', '').trim()
      console.log('Importando OCIs a partir do JSON:', caminho)
      const { ocisCriadas, procedimentosCriados } = await importarDesdeJson(caminho, prisma)
      console.log('Resultado:', ocisCriadas, 'OCIs processadas,', procedimentosCriados, 'procedimentos.')
    } else {
      const baseDir = path.resolve(process.cwd(), pastaArg || 'tabelas/TabelaUnificada_202601_v2601221740')
      if (!fs.existsSync(baseDir)) {
        console.error('Pasta não encontrada:', baseDir)
        process.exit(1)
      }
      console.log('Importando OCIs a partir da tabela SIGTAP em', baseDir)
      const { ocisCriadas, procedimentosCriados } = await importarDesdeSigtap(baseDir, prisma)
      console.log('Resultado:', ocisCriadas, 'OCIs processadas,', procedimentosCriados, 'procedimentos.')
    }
    console.log('Concluído.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Erro:', e)
  process.exit(1)
})
