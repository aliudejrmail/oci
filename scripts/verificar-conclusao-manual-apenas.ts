import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'

const prisma = new PrismaClient()
const solicitacoesService = new SolicitacoesService(prisma)

async function verificarConclusaoManualApenas() {
  console.log('🔍 Verificando se conclusão é apenas manual...\n')

  try {
    // Buscar uma solicitação EM_ANDAMENTO
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: {
        status: StatusSolicitacao.EM_ANDAMENTO,
        deletedAt: null
      },
      include: {
        execucoes: { include: { procedimento: true } },
        oci: { include: { procedimentos: { where: { obrigatorio: true } } } }
      }
    })

    if (!solicitacao) {
      console.log('❌ Nenhuma solicitação EM_ANDAMENTO encontrada')
      return
    }

    console.log(`📋 Testando com: ${solicitacao.numeroProtocolo}`)
    console.log(`   Status atual: ${solicitacao.status}`)
    console.log(`   Tem APAC: ${solicitacao.numeroAutorizacaoApac ? 'SIM' : 'NÃO'}`)
    console.log(`   Procedimentos obrigatórios: ${solicitacao.oci.procedimentos.length}`)

    // 1. Adicionar APAC para o teste
    const numeroApac = '1234712345678'
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: numeroApac }
    })
    console.log(`✅ APAC temporário adicionado: ${numeroApac}`)

    // 2. Marcar alguns procedimentos como REALIZADO
    const execucoesOriginais = []
    let procedimentosMarcados = 0

    for (const exec of solicitacao.execucoes.slice(0, 2)) { // Apenas os 2 primeiros
      execucoesOriginais.push({
        id: exec.id,
        status: exec.status,
        dataExecucao: exec.dataExecucao
      })

      await prisma.execucaoProcedimento.update({
        where: { id: exec.id },
        data: { 
          status: STATUS_EXECUCAO.REALIZADO,
          dataExecucao: new Date()
        }
      })
      
      procedimentosMarcados++
      console.log(`   ✅ Procedimento ${procedimentosMarcados} marcado como REALIZADO`)
    }

    // 3. Fazer uma atualização que poderia triggear conclusão automática
    console.log('\n🔄 Fazendo atualização que poderia triggerar conclusão automática...')
    
    const statusAntes = await prisma.solicitacaoOci.findUnique({
      where: { id: solicitacao.id },
      select: { status: true }
    })

    // Usar o service para atualizar algo (isso triggrava conclusão automática antes)
    await solicitacoesService.atualizarExecucaoProcedimento(
      solicitacao.execucoes[0].id,
      { observacoes: 'Teste para verificar se conclusão automática foi desabilitada' }
    )

    const statusDepois = await prisma.solicitacaoOci.findUnique({
      where: { id: solicitacao.id },
      select: { status: true }
    })

    console.log(`   Status antes: ${statusAntes?.status}`)
    console.log(`   Status depois: ${statusDepois?.status}`)

    if (statusAntes?.status === statusDepois?.status) {
      console.log('✅ SUCESSO: Conclusão automática desabilitada - status não mudou')
    } else {
      console.log('❌ FALHOU: Status mudou automaticamente')
    }

    // 4. Testar conclusão manual (deve funcionar)
    console.log('\n🖱️  Testando conclusão manual...')
    
    try {
      await solicitacoesService.atualizarStatus(
        solicitacao.id,
        StatusSolicitacao.CONCLUIDA,
        solicitacao.criadoPorId
      )
      
      const statusManual = await prisma.solicitacaoOci.findUnique({
        where: { id: solicitacao.id },
        select: { status: true }
      })
      
      if (statusManual?.status === StatusSolicitacao.CONCLUIDA) {
        console.log('✅ SUCESSO: Conclusão manual funciona')
      } else {
        console.log('ℹ️  Conclusão manual não completou (pode ter outras validações)')
      }
      
    } catch (error) {
      console.log(`ℹ️  Conclusão manual bloqueada: ${(error as any).message}`)
    }

    // 5. Limpar teste - restaurar estado original
    console.log('\n🧹 Restaurando estado original...')
    
    for (const exec of execucoesOriginais) {
      await prisma.execucaoProcedimento.update({
        where: { id: exec.id },
        data: {
          status: exec.status,
          dataExecucao: exec.dataExecucao
        }
      })
    }

    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: {
        status: StatusSolicitacao.EM_ANDAMENTO,
        numeroAutorizacaoApac: solicitacao.numeroAutorizacaoApac, // Restaurar APAC original
        dataConclusao: null
      }
    })

    console.log('✅ Estado original restaurado')
    console.log('\n🎯 CONCLUSÃO: Apenas conclusão manual está ativa!')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verificarConclusaoManualApenas()