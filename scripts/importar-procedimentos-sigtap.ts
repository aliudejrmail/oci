/**
 * Importa o catálogo de procedimentos da tabela SIGTAP (tb_procedimento.txt)
 * para a tabela ProcedimentoSigtap no banco.
 *
 * Uso:
 *   npx ts-node scripts/importar-procedimentos-sigtap.ts
 *   npx ts-node scripts/importar-procedimentos-sigtap.ts "tabelas/TabelaUnificada_202601_v2601221740"
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const ENCODING = 'latin1' as BufferEncoding
const BATCH_SIZE = 200

function lerTbProcedimento(dir: string): Array<{ codigo: string; nome: string; tipoComplexidade: string | null; competencia: string | null }> {
  const p = path.join(dir, 'tb_procedimento.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const linhas = buf.split(/\r?\n/).filter((l) => l.length >= 260)
  return linhas.map((line) => {
    const codigo = line.slice(0, 10).trim()
    const nome = line.slice(10, 260).trim()
    const tipoComplexidade = line.length > 261 ? line.slice(260, 261).trim() || null : null
    const competencia = line.length >= 336 ? line.slice(330, 336).trim() || null : null
    return { codigo, nome, tipoComplexidade, competencia }
  }).filter((r) => r.codigo && r.nome)
}

async function main() {
  const baseDir = path.resolve(
    process.cwd(),
    process.argv[2] || 'tabelas/TabelaUnificada_202601_v2601221740'
  )
  if (!fs.existsSync(baseDir)) {
    console.error('Pasta não encontrada:', baseDir)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  const sigtap = (prisma as { procedimentoSigtap?: { upsert: (a: object) => Promise<unknown>; count: (a?: object) => Promise<number> } }).procedimentoSigtap
  if (!sigtap) {
    console.error('Cliente Prisma sem modelo ProcedimentoSigtap.')
    console.error('Execute antes: npx prisma migrate deploy && npx prisma generate')
    process.exit(1)
  }

  console.log('Lendo tb_procedimento em', baseDir)
  const registros = lerTbProcedimento(baseDir)
  console.log('  Linhas válidas:', registros.length)

  try {
  const batch: Array<Promise<unknown>> = []

  for (const r of registros) {
    batch.push(
      sigtap.upsert({
        where: { codigo: r.codigo },
        create: {
          id: randomUUID(),
          codigo: r.codigo,
          nome: r.nome,
          tipoComplexidade: r.tipoComplexidade,
          competencia: r.competencia
        },
        update: {
          nome: r.nome,
          tipoComplexidade: r.tipoComplexidade,
          competencia: r.competencia
        }
      })
    )
    if (batch.length >= BATCH_SIZE) {
      await prisma.$transaction(batch as never)
      batch.length = 0
    }
  }

  if (batch.length > 0) {
    await prisma.$transaction(batch as never)
  }

  const total = await sigtap.count()
  console.log('Resultado:')
  console.log('  Procedimentos SIGTAP no banco:', total)
  console.log('Concluído.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Erro:', e)
  process.exit(1)
})
