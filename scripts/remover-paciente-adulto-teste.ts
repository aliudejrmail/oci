import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando paciente "Adulto Teste"...')

  const pacientes = await prisma.paciente.findMany({
    where: {
      nome: 'Adulto Teste',
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
      cns: true,
      solicitacoes: {
        select: { id: true, numeroProtocolo: true },
      },
    },
  })

  if (pacientes.length === 0) {
    console.log('✅ Nenhum paciente com nome "Adulto Teste" encontrado.')
    return
  }

  console.log(`Encontrados ${pacientes.length} paciente(s) com nome "Adulto Teste".`)
  for (const p of pacientes) {
    console.log(`- ID: ${p.id} | CPF: ${p.cpf} | CNS: ${p.cns} | Solicitações: ${p.solicitacoes.length}`)
  }

  // Para segurança, só vamos remover automaticamente se houver exatamente 1 paciente com esse nome
  if (pacientes.length > 1) {
    console.warn('⚠️ Há mais de um paciente com nome "Adulto Teste". Ajuste o script para selecionar o ID correto antes de remover.')
    return
  }

  const paciente = pacientes[0]

  console.log('\nRemovendo registros relacionados ao paciente:', paciente.id)

  // Remover execuções, anexos, alertas e solicitações ligados a esse paciente
  // Relações estão configuradas com onDelete: Cascade em SolicitacaoOci → Execucao/Alerta/Anexo
  const solicitacoesIds = paciente.solicitacoes.map((s) => s.id)

  if (solicitacoesIds.length > 0) {
    console.log(`- Removendo ${solicitacoesIds.length} solicitação(ões) OCI e dados relacionados...`)

    // Remover anexos das solicitações
    await prisma.anexoSolicitacao.deleteMany({
      where: { solicitacaoOciId: { in: solicitacoesIds } },
    })

    // Remover alertas de prazo
    await prisma.alertaPrazo.deleteMany({
      where: { solicitacaoId: { in: solicitacoesIds } },
    })

    // Remover execuções de procedimentos
    await prisma.execucaoProcedimento.deleteMany({
      where: { solicitacaoId: { in: solicitacoesIds } },
    })

    // Remover solicitações propriamente ditas
    await prisma.solicitacaoOci.deleteMany({
      where: { id: { in: solicitacoesIds } },
    })
  }

  console.log('- Removendo paciente...')
  await prisma.paciente.delete({ where: { id: paciente.id } })

  console.log('✅ Paciente "Adulto Teste" e seus registros relacionados foram removidos com sucesso.')
}

main()
  .catch((error) => {
    console.error('❌ Erro ao remover paciente "Adulto Teste":', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
