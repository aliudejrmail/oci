/**
 * Script para popular unidadeOrigemId, unidadeDestinoId e unidadeExecutoraId
 * em registros antigos que possuem apenas os campos texto (unidadeOrigem, unidadeDestino, unidadeExecutora).
 *
 * O formato armazenado é "CNES - Nome" (ex.: "1234567 - UBS Centro").
 * O script extrai o CNES e busca a UnidadeSaude correspondente.
 *
 * Uso: npm run popular:fks-unidades
 * Ou: npx ts-node scripts/popular-fks-unidades.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Extrai o CNES do formato "CNES - Nome" (pode ter variações de espaços) */
function extrairCnes(valor: string): string | null {
  if (!valor || typeof valor !== 'string') return null
  const trimmed = valor.trim()
  if (!trimmed) return null
  // Formato: "CNES - Nome" ou "CNES -Nome" ou "CNES- Nome"
  const match = trimmed.match(/^([0-9\s]+)\s*-\s*/)
  if (match) {
    return match[1].replace(/\s/g, '').replace(/\D/g, '') || null
  }
  // Se não tem " - ", talvez seja só o CNES
  const soNumeros = trimmed.replace(/\D/g, '')
  return soNumeros.length >= 6 ? soNumeros : null
}

/** Cache de CNES -> unidadeId para evitar buscas repetidas */
const cacheCnes = new Map<string, string | null>()

/** Busca UnidadeSaude por CNES (exato ou normalizado) */
async function buscarUnidadePorCnes(cnesStr: string): Promise<string | null> {
  if (!cnesStr) return null
  const cnesLimpo = cnesStr.replace(/\D/g, '')
  if (!cnesLimpo) return null

  const cacheKey = cnesLimpo
  if (cacheCnes.has(cacheKey)) return cacheCnes.get(cacheKey)!

  let unidade = await prisma.unidadeSaude.findFirst({
    where: { cnes: cnesLimpo },
    select: { id: true }
  })
  if (!unidade) {
    unidade = await prisma.unidadeSaude.findFirst({
      where: { cnes: cnesStr },
      select: { id: true }
    })
  }
  if (!unidade) {
    const todas = await prisma.unidadeSaude.findMany({ select: { id: true, cnes: true } })
    unidade = todas.find((u) => u.cnes.replace(/\D/g, '') === cnesLimpo) ?? null
  }
  const resultado = unidade?.id ?? null
  cacheCnes.set(cacheKey, resultado)
  return resultado
}

async function main() {
  console.log('🔧 Populando FKs de unidades em registros antigos...\n')

  let atualizadosOrigem = 0
  let atualizadosDestino = 0
  let atualizadosExecutora = 0
  let semMatchOrigem = 0
  let semMatchDestino = 0
  let semMatchExecutora = 0

  // 1. SolicitacaoOci - unidadeOrigemId
  const solicitacoesSemOrigemId = await prisma.solicitacaoOci.findMany({
    where: { unidadeOrigemId: null },
    select: { id: true, unidadeOrigem: true }
  })

  for (const sol of solicitacoesSemOrigemId) {
    if (!sol.unidadeOrigem?.trim()) continue
    const cnes = extrairCnes(sol.unidadeOrigem)
    if (!cnes) continue
    const unidadeId = await buscarUnidadePorCnes(cnes)
    if (unidadeId) {
      await prisma.solicitacaoOci.update({
        where: { id: sol.id },
        data: { unidadeOrigemId: unidadeId }
      })
      atualizadosOrigem++
    } else {
      semMatchOrigem++
      if (semMatchOrigem <= 5) {
        console.log(`  ⚠ Sem unidade para origem: "${sol.unidadeOrigem}"`)
      }
    }
  }

  // 2. SolicitacaoOci - unidadeDestinoId
  const solicitacoesSemDestinoId = await prisma.solicitacaoOci.findMany({
    where: { unidadeDestinoId: null },
    select: { id: true, unidadeDestino: true }
  })

  for (const sol of solicitacoesSemDestinoId) {
    if (!sol.unidadeDestino?.trim()) continue
    const cnes = extrairCnes(sol.unidadeDestino)
    if (!cnes) continue
    const unidadeId = await buscarUnidadePorCnes(cnes)
    if (unidadeId) {
      await prisma.solicitacaoOci.update({
        where: { id: sol.id },
        data: { unidadeDestinoId: unidadeId }
      })
      atualizadosDestino++
    } else {
      semMatchDestino++
      if (semMatchDestino <= 5) {
        console.log(`  ⚠ Sem unidade para destino: "${sol.unidadeDestino}"`)
      }
    }
  }

  // 3. ExecucaoProcedimento - unidadeExecutoraId
  const execucoesSemExecutoraId = await prisma.execucaoProcedimento.findMany({
    where: { unidadeExecutoraId: null },
    select: { id: true, unidadeExecutora: true }
  })

  for (const exec of execucoesSemExecutoraId) {
    if (!exec.unidadeExecutora?.trim()) continue
    const cnes = extrairCnes(exec.unidadeExecutora)
    if (!cnes) continue
    const unidadeId = await buscarUnidadePorCnes(cnes)
    if (unidadeId) {
      await prisma.execucaoProcedimento.update({
        where: { id: exec.id },
        data: { unidadeExecutoraId: unidadeId }
      })
      atualizadosExecutora++
    } else {
      semMatchExecutora++
      if (semMatchExecutora <= 5) {
        console.log(`  ⚠ Sem unidade para executora: "${exec.unidadeExecutora}"`)
      }
    }
  }

  console.log('\n📊 Resultado:')
  console.log(`  Solicitacoes - unidadeOrigemId: ${atualizadosOrigem} atualizado(s)${semMatchOrigem > 0 ? `, ${semMatchOrigem} sem correspondência` : ''}`)
  console.log(`  Solicitacoes - unidadeDestinoId: ${atualizadosDestino} atualizado(s)${semMatchDestino > 0 ? `, ${semMatchDestino} sem correspondência` : ''}`)
  console.log(`  Execucoes - unidadeExecutoraId: ${atualizadosExecutora} atualizado(s)${semMatchExecutora > 0 ? `, ${semMatchExecutora} sem correspondência` : ''}`)

  if (semMatchOrigem > 0 || semMatchDestino > 0 || semMatchExecutora > 0) {
    console.log('\n💡 Dica: Registros sem correspondência podem ter CNES/nome em formato diferente.')
    console.log('   Cadastre as unidades em Unidades Executantes e execute o script novamente.')
  }

  console.log('\n✅ Concluído.')
}

main()
  .catch((e) => {
    console.error('Erro:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
