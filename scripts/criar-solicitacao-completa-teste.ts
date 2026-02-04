/**
 * Script para criar uma solicitação completa com consulta especializada + anatomo-patológico.
 */

import { PrismaClient } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'

async function criarSolicitacaoCompleta(): Promise<void> {
  console.log('📋 Criando solicitação completa para teste...\n')
  
  const prisma = new PrismaClient()
  const solicitacoesService = new SolicitacoesService(prisma)
  
  try {
    // 1. Buscar OCI com procedimento anatomo-patológico
    const procedimentoAnatomo = await prisma.procedimentoOci.findFirst({
      where: {
        nome: { contains: 'ANATOMO-PATOLÓGICO', mode: 'insensitive' }
      },
      include: { 
        oci: { 
          include: { procedimentos: true } 
        } 
      }
    })

    if (!procedimentoAnatomo) {
      console.log('❌ Procedimento anatomo-patológico não encontrado.')
      return
    }

    // 2. Buscar um paciente
    const paciente = await prisma.paciente.findFirst()
    const usuario = await prisma.usuario.findFirst({
      where: { tipo: 'ADMIN' }
    })

    if (!paciente || !usuario) {
      console.log('❌ Paciente ou usuário não encontrado.')
      return
    }

    // 3. Criar solicitação
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() + 30)

    const novaSolicitacao = await prisma.solicitacaoOci.create({
      data: {
        numeroProtocolo: `OCI-COMPLETO-${Date.now()}`,
        pacienteId: paciente.id,
        ociId: procedimentoAnatomo.oci.id,
        status: 'PENDENTE',
        tipo: procedimentoAnatomo.oci.tipo,
        dataSolicitacao: new Date(),
        dataPrazo: dataLimite,
        unidadeOrigem: 'TESTE',
        criadoPorId: usuario.id
      }
    })

    console.log(`✅ Solicitação criada: ${novaSolicitacao.numeroProtocolo}`)

    // 4. Criar todas as execuções da OCI
    const execucoes = []
    for (const proc of procedimentoAnatomo.oci.procedimentos) {
      const execucao = await prisma.execucaoProcedimento.create({
        data: {
          solicitacaoId: novaSolicitacao.id,
          procedimentoId: proc.id,
          status: 'PENDENTE'
        }
      })
      execucoes.push(execucao)
      console.log(`   + Execução criada: ${proc.nome}`)
    }

    // 5. Encontrar e marcar consulta médica especializada como realizada
    const consultaExecucao = execucoes.find(exec => {
      const proc = procedimentoAnatomo.oci.procedimentos.find(p => p.id === exec.procedimentoId)
      return proc && proc.nome.toLowerCase().includes('consulta') && proc.nome.toLowerCase().includes('especializada')
    })

    if (consultaExecucao) {
      await solicitacoesService.atualizarExecucaoProcedimento(consultaExecucao.id, {
        status: 'REALIZADO',
        dataExecucao: new Date()
      })
      console.log(`   ✅ Consulta especializada marcada como REALIZADA`)
    } else {
      console.log(`   ⚠️  Nenhuma consulta especializada encontrada na OCI`)
    }

    // 6. Encontrar execução do procedimento anatomo-patológico
    const anatomoExecucao = execucoes.find(exec => {
      const proc = procedimentoAnatomo.oci.procedimentos.find(p => p.id === exec.procedimentoId)
      return proc && proc.nome.toLowerCase().includes('anatomo') && proc.nome.toLowerCase().includes('patol')
    })

    if (anatomoExecucao) {
      console.log(`   🔬 Procedimento anatomo-patológico pronto para teste: ${anatomoExecucao.id}`)
    }

    console.log('\n✅ Solicitação completa criada e pronta para teste!')

  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  criarSolicitacaoCompleta()
}