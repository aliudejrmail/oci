/**
 * Verifica execuções de uma solicitação (para debug).
 * Uso: npx ts-node scripts/verificar-execucoes-solicitacao.ts OCI-20260203-00001
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const numeroProtocolo = process.argv[2] || 'OCI-20260203-00001'

  const solicitacao = await prisma.solicitacaoOci.findUnique({
    where: { numeroProtocolo },
    include: { execucoes: { include: { procedimento: true }, orderBy: { createdAt: 'asc' } } }
  })

  if (!solicitacao) {
    console.error('Solicitação não encontrada.')
    process.exit(1)
  }

  console.log(`Solicitação: ${numeroProtocolo}\n`)
  solicitacao.execucoes.forEach((e, i) => {
    console.log(`${i + 1}. ${e.procedimento.nome}`)
    console.log(`   status: ${e.status}`)
    console.log(`   dataExecucao: ${e.dataExecucao ?? 'null'}`)
    console.log(`   dataColetaMaterialBiopsia: ${e.dataColetaMaterialBiopsia ?? 'null'}`)
    console.log('')
  })
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
