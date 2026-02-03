/**
 * Importa compatibilidades CID e CBO dos 34 procedimentos de OCI (código 09...)
 * da tabela compacta SIGTAP para as tabelas compatibilidade_cid_sigtap e
 * compatibilidade_cbo_sigtap.
 *
 * Pré-requisito: procedimentos_sigtap já populada (npm run importar:procedimentos-sigtap).
 * Migração das novas tabelas aplicada (npx prisma migrate deploy).
 *
 * Uso:
 *   npx ts-node scripts/importar-compatibilidade-oci-sigtap.ts
 *   npx ts-node scripts/importar-compatibilidade-oci-sigtap.ts "tabelas/TabelaUnificada_202601_v2601221740"
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const ENCODING = 'latin1' as BufferEncoding
const PREFIXO_OCI = '09'

function carregarTbCid(dir: string): Map<string, string> {
  const p = path.join(dir, 'tb_cid.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const map = new Map<string, string>()
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 4) continue
    const co = line.slice(0, 4).trim()
    const no = line.slice(4, 104).trim()
    if (co) map.set(co, no)
  }
  return map
}

function carregarTbOcupacao(dir: string): Map<string, string> {
  const p = path.join(dir, 'tb_ocupacao.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const map = new Map<string, string>()
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 6) continue
    const co = line.slice(0, 6).trim()
    const no = line.slice(6, 156).trim()
    if (co) map.set(co, no)
  }
  return map
}

function carregarRlProcedimentoCid(dir: string): Map<string, Set<string>> {
  const p = path.join(dir, 'rl_procedimento_cid.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const map = new Map<string, Set<string>>()
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 14) continue
    const proc = line.slice(0, 10).trim()
    const cid = line.slice(10, 14).trim()
    if (!proc || !cid) continue
    if (!map.has(proc)) map.set(proc, new Set())
    map.get(proc)!.add(cid)
  }
  return map
}

function carregarRlProcedimentoOcupacao(dir: string): Map<string, Set<string>> {
  const p = path.join(dir, 'rl_procedimento_ocupacao.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const map = new Map<string, Set<string>>()
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 16) continue
    const proc = line.slice(0, 10).trim()
    const cbo = line.slice(10, 16).trim()
    if (!proc || !cbo) continue
    if (!map.has(proc)) map.set(proc, new Set())
    map.get(proc)!.add(cbo)
  }
  return map
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

  console.log('Carregando arquivos SIGTAP em', baseDir)
  const mapCid = carregarTbCid(baseDir)
  const mapCbo = carregarTbOcupacao(baseDir)
  const procCids = carregarRlProcedimentoCid(baseDir)
  const procCbos = carregarRlProcedimentoOcupacao(baseDir)

  const prisma = new PrismaClient()
  try {
    const procedimentosSigtap = await prisma.procedimentoSigtap.findMany({
      where: { codigo: { startsWith: PREFIXO_OCI } },
      select: { id: true, codigo: true, nome: true }
    })
    console.log('  Procedimentos OCI em procedimentos_sigtap:', procedimentosSigtap.length)

    let cidInseridos = 0
    let cboInseridos = 0
    let semCid = 0
    let semCbo = 0

    for (const proc of procedimentosSigtap) {
      const codigo = proc.codigo
      const cids = procCids.get(codigo)
      const cbos = procCbos.get(codigo)

      await prisma.compatibilidadeCidSigtap.deleteMany({ where: { procedimentoSigtapId: proc.id } })
      await prisma.compatibilidadeCboSigtap.deleteMany({ where: { procedimentoSigtapId: proc.id } })

      if (cids?.size) {
        const rows = Array.from(cids).map((cidCodigo) => ({
          id: randomUUID(),
          procedimentoSigtapId: proc.id,
          cidCodigo,
          cidDescricao: mapCid.get(cidCodigo) ?? null
        }))
        await prisma.compatibilidadeCidSigtap.createMany({ data: rows })
        cidInseridos += rows.length
      } else {
        semCid++
      }

      if (cbos?.size) {
        const rows = Array.from(cbos).map((cboCodigo) => ({
          id: randomUUID(),
          procedimentoSigtapId: proc.id,
          cboCodigo,
          cboDescricao: mapCbo.get(cboCodigo) ?? null
        }))
        await prisma.compatibilidadeCboSigtap.createMany({ data: rows })
        cboInseridos += rows.length
      } else {
        semCbo++
      }
    }

    console.log('\nResultado:')
    console.log('  CompatibilidadeCidSigtap inseridas:', cidInseridos)
    console.log('  CompatibilidadeCboSigtap inseridas:', cboInseridos)
    if (semCid || semCbo) {
      console.log('  Procedimentos OCI (dos 34) sem CID nos arquivos:', semCid, '| sem CBO:', semCbo)
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
