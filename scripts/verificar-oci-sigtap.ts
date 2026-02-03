/**
 * Verifica quantos procedimentos de OCI (código 09...) estão em procedimentos_sigtap
 * e o estado das compatibilidades CID/CBO no banco.
 *
 * Uso: npx ts-node scripts/verificar-oci-sigtap.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  try {
    // 1) Procedimentos SIGTAP de OCI (código começa com 09)
    const totalSigtap = await prisma.procedimentoSigtap.count()
    const ociSigtap = await prisma.procedimentoSigtap.findMany({
      where: { codigo: { startsWith: '09' } },
      select: { codigo: true, nome: true }
    })

    console.log('--- Procedimentos SIGTAP ---')
    console.log('Total em procedimentos_sigtap:', totalSigtap)
    console.log('Procedimentos de OCI (código 09...):', ociSigtap.length)
    if (ociSigtap.length > 0 && ociSigtap.length <= 40) {
      ociSigtap.forEach((p) => console.log('  ', p.codigo, p.nome?.slice(0, 60)))
    }

    // 2) Compatibilidades por ProcedimentoOci (existentes)
    const [totalCid, totalCbo, procsComSigtap] = await Promise.all([
      prisma.compatibilidadeCid.count(),
      prisma.compatibilidadeCbo.count(),
      prisma.procedimentoOci.findMany({
        where: { codigoSigtap: { not: null } },
        select: { id: true, nome: true, codigoSigtap: true, _count: { select: { compatibilidadeCid: true, compatibilidadeCbo: true } } }
      })
    ])

    console.log('\n--- Compatibilidades (por ProcedimentoOci) ---')
    console.log('Total CompatibilidadeCid:', totalCid)
    console.log('Total CompatibilidadeCbo:', totalCbo)
    console.log('ProcedimentoOci com codigoSigtap preenchido:', procsComSigtap.length)
    procsComSigtap.forEach((p) => {
      console.log('  ', p.codigoSigtap, p.nome, '| CID:', p._count.compatibilidadeCid, 'CBO:', p._count.compatibilidadeCbo)
    })

    // 3) Compatibilidades dos 34 procedimentos OCI (compatibilidade_cid_sigtap / compatibilidade_cbo_sigtap)
    const [totalCidSigtap, totalCboSigtap, ociComCompat] = await Promise.all([
      prisma.compatibilidadeCidSigtap.count(),
      prisma.compatibilidadeCboSigtap.count(),
      prisma.procedimentoSigtap.findMany({
        where: { codigo: { startsWith: '09' } },
        select: { codigo: true, nome: true, _count: { select: { compatibilidadeCidSigtap: true, compatibilidadeCboSigtap: true } } }
      })
    ])
    console.log('\n--- Compatibilidades dos 34 procedimentos OCI (procedimentos_sigtap) ---')
    console.log('Total CompatibilidadeCidSigtap:', totalCidSigtap)
    console.log('Total CompatibilidadeCboSigtap:', totalCboSigtap)
    ociComCompat.slice(0, 8).forEach((p) => {
      console.log('  ', p.codigo, (p.nome || '').slice(0, 45), '| CID:', p._count.compatibilidadeCidSigtap, 'CBO:', p._count.compatibilidadeCboSigtap)
    })
    if (ociComCompat.length > 8) console.log('  ... e mais', ociComCompat.length - 8, 'procedimentos')

    console.log('\n--- Resumo ---')
    if (ociSigtap.length === 34) {
      console.log('Sim: os 34 procedimentos de OCI estão em procedimentos_sigtap.')
    } else if (totalSigtap === 0) {
      console.log('Não: procedimentos_sigtap está vazia. Rode: npm run importar:procedimentos-sigtap')
    } else {
      console.log('Procedimentos de OCI em procedimentos_sigtap:', ociSigtap.length, '(esperado: 34).')
    }
    if (totalCidSigtap > 0 || totalCboSigtap > 0) {
      console.log('Compatibilidades dos 34 (CID/CBO por ProcedimentoSigtap):', totalCidSigtap, 'CID,', totalCboSigtap, 'CBO.')
    } else if (ociSigtap.length === 34) {
      console.log('Para importar CID/CBO dos 34: npm run importar:compatibilidade-oci-sigtap')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
