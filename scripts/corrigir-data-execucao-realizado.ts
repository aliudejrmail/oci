/**
 * Corrige dataExecucao de procedimentos REALIZADO que estão com data nula.
 * Usa data de referência: dataColetaMaterialBiopsia de outro procedimento, ou createdAt da solicitação.
 *
 * Uso: npx ts-node scripts/corrigir-data-execucao-realizado.ts OCI-20260203-00001
 */
import { PrismaClient } from '@prisma/client'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'

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

  // Encontrar data de referência: dataColetaMaterialBiopsia de algum procedimento ou createdAt da solicitação
  const execComDataColeta = solicitacao.execucoes.find((e) => e.dataColetaMaterialBiopsia != null)
  const dataReferencia = execComDataColeta?.dataColetaMaterialBiopsia ?? solicitacao.createdAt

  const execucoesSemData = solicitacao.execucoes.filter(
    (e) => e.status === STATUS_EXECUCAO.REALIZADO && e.dataExecucao == null
  )

  if (execucoesSemData.length === 0) {
    console.log(`Nenhum procedimento REALIZADO sem data na solicitação ${numeroProtocolo}.`)
    return
  }

  console.log(`Corrigindo dataExecucao de ${execucoesSemData.length} procedimento(s) REALIZADO em ${numeroProtocolo}...`)
  console.log(`Data de referência: ${dataReferencia.toISOString().split('T')[0]}\n`)

  for (const exec of execucoesSemData) {
    await prisma.execucaoProcedimento.update({
      where: { id: exec.id },
      data: { dataExecucao: dataReferencia }
    })
    console.log(`  ✓ ${exec.procedimento.nome}: dataExecucao = ${dataReferencia.toISOString().split('T')[0]}`)
  }

  console.log('\nConcluído.')
}

main()
  .catch((e) => {
    console.error('Erro:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
