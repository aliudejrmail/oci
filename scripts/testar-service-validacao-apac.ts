import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'

const prisma = new PrismaClient()
const solicitacoesService = new SolicitacoesService(prisma)

async function testarServiceValidacaoApac() {
  console.log('🔍 Testando validação APAC através do SolicitacoesService...\n')

  try {
    // Buscar uma solicitação EM_ANDAMENTO sem número APAC
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: {
        status: 'EM_ANDAMENTO',
        numeroAutorizacaoApac: null,
        deletedAt: null
      }
    })

    if (!solicitacao) {
      console.log('❌ Nenhuma solicitação EM_ANDAMENTO sem APAC encontrada')
      return
    }

    console.log(`📋 Testando com: ${solicitacao.numeroProtocolo}`)
    console.log(`   Status: ${solicitacao.status}`)
    console.log(`   APAC: ${solicitacao.numeroAutorizacaoApac || 'NÃO INFORMADO'}`)

    // 1. Testar tentativa de conclusão manual através do service
    console.log('\n1. Testando conclusão manual sem APAC via service...')
    
    try {
      await solicitacoesService.atualizarStatus(
        solicitacao.id,
        'CONCLUIDA',
        solicitacao.criadoPorId
      )
      console.log('❌ FALHOU: Service permitiu conclusão sem APAC!')
    } catch (error) {
      console.log('✅ SUCESSO: Service bloqueou conclusão sem APAC')
      console.log(`   Erro: ${(error as any).message}`)
    }

    // 2. Adicionar APAC e testar novamente
    console.log('\n2. Adicionando número APAC e testando...')
    
    const numeroApac = '1234712345678'
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: numeroApac }
    })
    
    console.log(`✅ APAC adicionado: ${numeroApac}`)

    try {
      const resultado = await solicitacoesService.atualizarStatus(
        solicitacao.id,
        'CONCLUIDA',
        solicitacao.criadoPorId
      )
      console.log('✅ SUCESSO: Service permitiu conclusão com APAC')
      console.log(`   Novo status: ${resultado?.status || 'N/A'}`)
      
      // Reverter para EM_ANDAMENTO
      await prisma.solicitacaoOci.update({
        where: { id: solicitacao.id },
        data: { 
          status: 'EM_ANDAMENTO',
          dataConclusao: null
        }
      })
      console.log('🔄 Status revertido para EM_ANDAMENTO')
      
    } catch (error) {
      console.log(`ℹ️  Service não concluiu (pode ter outras validações): ${(error as any).message}`)
    }

    // 3. Limpar APAC de teste
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: null }
    })
    
    console.log('🗑️  Número APAC removido')

    console.log('\n✅ Teste completo!')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarServiceValidacaoApac()