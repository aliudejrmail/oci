/**
 * Script para criar uma solicitação com procedimento anatomo-patológico para teste.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function criarSolicitacaoTeste(): Promise<void> {
  console.log('📋 Criando solicitação com procedimento anatomo-patológico...\n')
  
  try {
    // 1. Buscar OCI e procedimento anatomo-patológico
    const procedimento = await prisma.procedimentoOci.findFirst({
      where: {
        nome: { contains: 'ANATOMO-PATOLÓGICO', mode: 'insensitive' }
      },
      include: { oci: true }
    })

    if (!procedimento) {
      console.log('❌ Procedimento anatomo-patológico não encontrado.')
      return
    }

    // 2. Buscar um paciente
    const paciente = await prisma.paciente.findFirst()

    if (!paciente) {
      console.log('❌ Nenhum paciente encontrado.')
      return
    }

    // 3. Buscar usuário admin
    const usuario = await prisma.usuario.findFirst({
      where: { tipo: 'ADMIN' }
    })

    if (!usuario) {
      console.log('❌ Usuário admin não encontrado.')
      return
    }

    // 4. Criar solicitação
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() + 30)

    const novaSolicitacao = await prisma.solicitacaoOci.create({
      data: {
        numeroProtocolo: `OCI-TEST-${Date.now()}`,
        pacienteId: paciente.id,
        ociId: procedimento.oci.id,
        status: 'PENDENTE',
        tipo: procedimento.oci.tipo,
        dataSolicitacao: new Date(),
        dataPrazo: dataLimite,
        unidadeOrigem: 'TESTE',
        criadoPorId: usuario.id
      }
    })

    console.log(`✅ Solicitação criada: ${novaSolicitacao.numeroProtocolo}`)

    // 5. Criar execução do procedimento anatomo-patológico
    const novaExecucao = await prisma.execucaoProcedimento.create({
      data: {
        solicitacaoId: novaSolicitacao.id,
        procedimentoId: procedimento.id,
        status: 'PENDENTE'
      }
    })

    console.log(`✅ Execução criada: ${novaExecucao.id}`)
    console.log(`🔬 Procedimento: ${procedimento.nome}`)
    console.log(`👤 Paciente: ${paciente.nome}`)
    console.log('\n✅ Pronto para testar a funcionalidade!')

  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  criarSolicitacaoTeste()
}