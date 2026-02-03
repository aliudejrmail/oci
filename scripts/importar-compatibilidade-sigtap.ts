/**
 * Importa compatibilidades CID e CBO da tabela compacta SIGTAP para os
 * ProcedimentoOci que tenham codigoSigtap (ou que forem encontrados por nome em tb_procedimento).
 *
 * Uso:
 *   npx ts-node scripts/importar-compatibilidade-sigtap.ts
 *   npx ts-node scripts/importar-compatibilidade-sigtap.ts "tabelas/TabelaUnificada_202601_v2601221740"
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const ENCODING = 'latin1' as BufferEncoding

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function codigoSigtapParaChave(cod: string): string {
  return cod.replace(/\D/g, '').padStart(10, '0').slice(0, 10)
}

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

function carregarTbProcedimento(dir: string): Array<{ codigo: string; nome: string }> {
  const p = path.join(dir, 'tb_procedimento.txt')
  const buf = fs.readFileSync(p, { encoding: ENCODING })
  const arr: Array<{ codigo: string; nome: string }> = []
  for (const line of buf.split(/\r?\n/)) {
    if (line.length < 10) continue
    const codigo = line.slice(0, 10).trim()
    const nome = line.slice(10, 260).trim()
    if (codigo && nome) arr.push({ codigo, nome })
  }
  return arr
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

function buscarCodigoPorNome(
  nomeProcedimento: string,
  listaProc: Array<{ codigo: string; nome: string }>
): string | null {
  const palavras = nomeProcedimento
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(normalizarTexto)
  if (palavras.length === 0) return null
  const candidatos = listaProc.filter((p) => {
    const n = normalizarTexto(p.nome)
    return palavras.every((k) => n.includes(k))
  })
  if (candidatos.length === 0) return null
  return candidatos[0].codigo
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
  const listaProc = carregarTbProcedimento(baseDir)
  const procCids = carregarRlProcedimentoCid(baseDir)
  const procCbos = carregarRlProcedimentoOcupacao(baseDir)
  console.log('  tb_cid:', mapCid.size, '| tb_ocupacao:', mapCbo.size, '| tb_procedimento:', listaProc.length)
  console.log('  rl_procedimento_cid:', procCids.size, 'procedimentos | rl_procedimento_ocupacao:', procCbos.size, 'procedimentos')

  const prisma = new PrismaClient()
  try {
  const procedimentos = await prisma.procedimentoOci.findMany({
    select: { id: true, nome: true, codigoSigtap: true }
  })

  let atualizados = 0
  let cidInseridos = 0
  let cboInseridos = 0

  for (const proc of procedimentos) {
    let chave = proc.codigoSigtap ? codigoSigtapParaChave(proc.codigoSigtap) : null
    if (!chave) {
      const cod = buscarCodigoPorNome(proc.nome, listaProc)
      if (cod) {
        chave = cod
        await prisma.procedimentoOci.update({
          where: { id: proc.id },
          data: { codigoSigtap: chave }
        })
        atualizados++
        console.log('  codigoSigtap definido:', proc.nome, '->', chave)
      } else {
        continue
      }
    }

    const cids = procCids.get(chave)
    const cbos = procCbos.get(chave)
    if (!cids?.size && !cbos?.size) continue

    await prisma.compatibilidadeCid.deleteMany({ where: { procedimentoOciId: proc.id } })
    await prisma.compatibilidadeCbo.deleteMany({ where: { procedimentoOciId: proc.id } })

    if (cids?.size) {
      const rows = Array.from(cids).map((cidCodigo) => ({
        procedimentoOciId: proc.id,
        cidCodigo,
        cidDescricao: mapCid.get(cidCodigo) ?? null
      }))
      await prisma.compatibilidadeCid.createMany({ data: rows })
      cidInseridos += rows.length
    }
    if (cbos?.size) {
      const rows = Array.from(cbos).map((cboCodigo) => ({
        procedimentoOciId: proc.id,
        cboCodigo,
        cboDescricao: mapCbo.get(cboCodigo) ?? null
      }))
      await prisma.compatibilidadeCbo.createMany({ data: rows })
      cboInseridos += rows.length
    }
  }

  console.log('Resultado:')
  console.log('  Procedimentos com codigoSigtap definido automaticamente:', atualizados)
  console.log('  CompatibilidadeCid inseridas:', cidInseridos)
  console.log('  CompatibilidadeCbo inseridas:', cboInseridos)
  console.log('Concluído.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Erro:', e)
  process.exit(1)
})
