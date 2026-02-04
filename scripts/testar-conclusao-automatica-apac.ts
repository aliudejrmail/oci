import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'

const prisma = new PrismaClient()
const solicitacoesService = new SolicitacoesService(prisma)

async function testarConclusaoAutomaticaApac() {
  console.log('🔍 Testando conclusão automática com validação APAC...\n')

  try {
    // Buscar uma solicitação que possa ser usada para teste
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: {
        status: StatusSolicitacao.EM_ANDAMENTO,
        deletedAt: null
      },
      include: {
        execucoes: {
          include: { procedimento: true }
        },
        oci: {
          include: { procedimentos: true }
        }
      }
    })

    if (!solicitacao) {
      console.log('❌ Nenhuma solicitação EM_ANDAMENTO encontrada para teste')
      return
    }

    console.log(`📋 Testando com: ${solicitacao.numeroProtocolo}`)
    console.log(`   Status: ${solicitacao.status}`)
    console.log(`   APAC: ${solicitacao.numeroAutorizacaoApac || 'NÃO INFORMADO'}`)
    console.log(`   Execuções: ${solicitacao.execucoes.length}`)
    
    // Verificar se tem procedimentos obrigatórios
    const procedimentosObrigatorios = solicitacao.oci.procedimentos.filter(p => p.obrigatorio)
    console.log(`   Procedimentos obrigatórios: ${procedimentosObrigatorios.length}`)

    if (procedimentosObrigatorios.length === 0) {
      console.log('ℹ️  Esta OCI não tem procedimentos obrigatórios, não é ideal para teste')
      return
    }

    // 1. Marcar todos os procedimentos obrigatórios como REALIZADO (sem APAC)
    console.log('\n1. Marcando procedimentos obrigatórios como REALIZADO...')
    
    const execucoesOriginais = new Map()
    
    for (const exec of solicitacao.execucoes) {
      // Salvar status original
      execucoesOriginais.set(exec.id, { status: exec.status, dataExecucao: exec.dataExecucao })
      
      const procedimento = procedimentosObrigatorios.find(p => p.id === exec.procedimentoId)
      if (procedimento) {
        await prisma.execucaoProcedimento.update({
          where: { id: exec.id },
          data: { 
            status: STATUS_EXECUCAO.REALIZADO,
            dataExecucao: new Date()
          }
        })
        console.log(`   ✅ ${procedimento.nome} → REALIZADO`)
      }
    }

    // 2. Simular atualização automática (sem APAC)
    console.log('\n2. Simulando atualização automática sem APAC...')
    
    // Recarregar solicitação
    const solAtualizada = await prisma.solicitacaoOci.findUnique({
      where: { id: solicitacao.id },
      include: { execucoes: { include: { procedimento: true } } }
    })
    
    if (!solAtualizada) {
      console.log('❌ Erro ao recarregar solicitação')
      return
    }

    console.log(`   Status antes: ${solAtualizada.status}`)
    console.log(`   APAC: ${solAtualizada.numeroAutorizacaoApac || 'NÃO INFORMADO'}`)

    // Trigger da atualização automática via service
    await solicitacoesService.atualizarExecucaoProcedimento(
      solicitacao.execucoes[0].id,
      { observacoes: 'Teste trigger conclusão automática' }
    )

    // Verificar se status mudou
    const solDepois = await prisma.solicitacaoOci.findUnique({
      where: { id: solicitacao.id }
    })

    console.log(`   Status depois: ${solDepois?.status}`)
    
    if (solDepois?.status === StatusSolicitacao.CONCLUIDA) {
      console.log('❌ FALHOU: Marcou como CONCLUÍDA automaticamente sem APAC!')
    } else {
      console.log('✅ SUCESSO: NÃO marcou como CONCLUÍDA sem APAC')
    }

    // 3. Adicionar APAC e testar novamente
    console.log('\n3. Adicionando APAC e testando conclusão automática...')
    
    const numeroApac = '1234712345678'
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: numeroApac }
    })
    
    console.log(`   APAC adicionado: ${numeroApac}`)

    // Trigger da atualização automática novamente
    await solicitacoesService.atualizarExecucaoProcedimento(
      solicitacao.execucoes[0].id,
      { observacoes: 'Teste trigger conclusão automática com APAC' }
    )

    // Verificar se status mudou agora
    const solFinal = await prisma.solicitacaoOci.findUnique({
      where: { id: solicitacao.id }
    })

    console.log(`   Status final: ${solFinal?.status}`)
    
    if (solFinal?.status === StatusSolicitacao.CONCLUIDA) {
      console.log('✅ SUCESSO: Marcou como CONCLUÍDA automaticamente com APAC!')
    } else {
      console.log('ℹ️  Não marcou como CONCLUÍDA (pode ter outras validações pendentes)')
    }

    // 4. Restaurar estado original
    console.log('\n4. Restaurando estado original...')
    
    for (const exec of solicitacao.execucoes) {
      const original = execucoesOriginais.get(exec.id)
      if (original) {
        await prisma.execucaoProcedimento.update({
          where: { id: exec.id },
          data: { 
            status: original.status,
            dataExecucao: original.dataExecucao
          }
        })
      }
    }

    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { 
        status: StatusSolicitacao.EM_ANDAMENTO,
        numeroAutorizacaoApac: null,
        dataConclusao: null
      }
    })
    
    console.log('🔄 Estado original restaurado')
    console.log('\n✅ Teste de conclusão automática completo!')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarConclusaoAutomaticaApac()