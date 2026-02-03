/**
 * Corrige status dos procedimentos de uma solicitação específica no banco.
 * - EXECUTADO -> REALIZADO
 * - Consulta/teleconsulta especializada: quando uma é REALIZADO, a outra fica DISPENSADO
 *
 * Uso: npx ts-node scripts/corrigir-status-solicitacao.ts OCI-20260203-00001
 * Ou: npm run corrigir:status-solicitacao -- OCI-20260203-00001
 */
import { PrismaClient } from '@prisma/client'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'

function isConsultaMedicaEspecializada(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return n.includes('consulta') && n.includes('especializada')
}

const prisma = new PrismaClient()

async function main() {
  const numeroProtocolo = process.argv[2] || 'OCI-20260203-00001'

  const solicitacao = await prisma.solicitacaoOci.findUnique({
    where: { numeroProtocolo },
    include: {
      execucoes: { include: { procedimento: true } }
    }
  })

  if (!solicitacao) {
    console.error(`Solicitação ${numeroProtocolo} não encontrada.`)
    process.exit(1)
  }

  console.log(`Corrigindo status da solicitação ${numeroProtocolo} (${solicitacao.execucoes.length} procedimentos)...\n`)

  let atualizados = 0

  // 1. EXECUTADO -> REALIZADO
  for (const exec of solicitacao.execucoes) {
    if (exec.status === 'EXECUTADO') {
      await prisma.execucaoProcedimento.update({
        where: { id: exec.id },
        data: { status: STATUS_EXECUCAO.REALIZADO }
      })
      console.log(`  ✓ ${exec.procedimento.nome}: EXECUTADO -> REALIZADO`)
      atualizados++
    }
  }

  // 2. Recarregar execuções após possível atualização
  const execucoesAtualizadas = await prisma.execucaoProcedimento.findMany({
    where: { solicitacaoId: solicitacao.id },
    include: { procedimento: true }
  })

  // 3. Consulta/teleconsulta especializada: se uma é REALIZADO, outra PENDENTE/AGENDADO -> DISPENSADO
  const consultasEspecializadas = execucoesAtualizadas.filter((e) =>
    isConsultaMedicaEspecializada(e.procedimento.nome)
  )

  const algumaRealizada = consultasEspecializadas.some((e) => e.status === STATUS_EXECUCAO.REALIZADO)

  if (algumaRealizada) {
    for (const exec of consultasEspecializadas) {
      if (
        (exec.status === STATUS_EXECUCAO.PENDENTE || exec.status === STATUS_EXECUCAO.AGENDADO)
      ) {
        await prisma.execucaoProcedimento.update({
          where: { id: exec.id },
          data: { status: STATUS_EXECUCAO.DISPENSADO }
        })
        console.log(`  ✓ ${exec.procedimento.nome}: ${exec.status} -> DISPENSADO`)
        atualizados++
      }
    }
  }

  // Exibir estado final
  const estadoFinal = await prisma.execucaoProcedimento.findMany({
    where: { solicitacaoId: solicitacao.id },
    include: { procedimento: true },
    orderBy: { createdAt: 'asc' }
  })

  console.log('\nEstado final dos procedimentos:')
  estadoFinal.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.procedimento.nome}: ${e.status}`)
  })

  console.log(`\nConcluído. ${atualizados} registro(s) corrigido(s).`)
}

main()
  .catch((e) => {
    console.error('Erro:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
