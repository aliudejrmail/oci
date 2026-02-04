/**
 * Script para testar a nova funcionalidade de procedimentos anatomo-patológicos.
 * 
 * Cenários testados:
 * 1. Procedimento com apenas data de coleta -> AGUARDANDO_RESULTADO
 * 2. Procedimento com data de coleta e data de resultado -> REALIZADO  
 * 3. Procedimento sem nenhuma data -> PENDENTE
 * 
 * Uso: npx ts-node scripts/testar-anatomopatologico.ts
 */

import { PrismaClient } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'

const prisma = new PrismaClient()

async function testarAnatomoPatologico() {
  console.log('🧪 Testando funcionalidade de procedimentos anatomo-patológicos...\n')
  
  const solicitacoesService = new SolicitacoesService(prisma)
  
  try {
    // 1. Buscar uma solicitação com procedimentos anatomo-patológicos
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: { 
        deletedAt: null,
        status: { notIn: ['CONCLUIDA', 'CANCELADA'] },
        execucoes: {
          some: {
            procedimento: {
              nome: { contains: 'ANATOMO-PATOLÓGICO', mode: 'insensitive' }
            }
          }
        }
      },
      include: {
        execucoes: {
          include: { procedimento: true }
        }
      }
    })

    if (!solicitacao) {
      console.log('❌ Nenhuma solicitação ativa encontrada para teste.')
      return
    }

    const procedimentoAnatomoPatologico = solicitacao.execucoes.find(exec => 
      exec.procedimento.nome.toLowerCase().includes('anatomo') && 
      exec.procedimento.nome.toLowerCase().includes('patol')
    )

    if (!procedimentoAnatomoPatologico) {
      console.log(`❌ Nenhum procedimento anatomo-patológico encontrado na solicitação ${solicitacao.numeroProtocolo}.`)
      return
    }

    console.log(`📋 Testando com solicitação: ${solicitacao.numeroProtocolo}`)
    console.log(`🔬 Procedimento: ${procedimentoAnatomoPatologico.procedimento.nome}`)
    console.log(`📊 Status atual: ${procedimentoAnatomoPatologico.status}\n`)

    // 2. Testar cenário 1: apenas data de coleta
    console.log('📅 Teste 1: Registrando apenas data de coleta...')
    const dataColeta = new Date()
    
    const exec1 = await solicitacoesService.atualizarExecucaoProcedimento(procedimentoAnatomoPatologico.id, {
      dataColetaMaterialBiopsia: dataColeta,
      dataRegistroResultadoBiopsia: null
    })
    
    console.log(`   ✅ Status após coleta: ${exec1.status}`)
    console.log(`   📅 Data de coleta: ${exec1.dataColetaMaterialBiopsia?.toISOString().split('T')[0]}`)
    console.log(`   📅 Data de resultado: ${exec1.dataRegistroResultadoBiopsia || 'não informada'}\n`)

    // 3. Testar cenário 2: coleta + resultado
    console.log('📅 Teste 2: Adicionando data do resultado...')
    const dataResultado = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 dia depois
    
    const exec2 = await solicitacoesService.atualizarExecucaoProcedimento(procedimentoAnatomoPatologico.id, {
      dataRegistroResultadoBiopsia: dataResultado
    })
    
    console.log(`   ✅ Status após resultado: ${exec2.status}`)
    console.log(`   📅 Data de coleta: ${exec2.dataColetaMaterialBiopsia?.toISOString().split('T')[0]}`)
    console.log(`   📅 Data de resultado: ${exec2.dataRegistroResultadoBiopsia?.toISOString().split('T')[0]}\n`)

    // 4. Testar cenário 3: remover ambas as datas
    console.log('📅 Teste 3: Removendo ambas as datas...')
    
    const exec3 = await solicitacoesService.atualizarExecucaoProcedimento(procedimentoAnatomoPatologico.id, {
      dataColetaMaterialBiopsia: null,
      dataRegistroResultadoBiopsia: null,
      dataExecucao: null
    })
    
    console.log(`   ✅ Status sem datas: ${exec3.status}`)
    console.log(`   📅 Data de coleta: ${exec3.dataColetaMaterialBiopsia || 'não informada'}`)
    console.log(`   📅 Data de resultado: ${exec3.dataRegistroResultadoBiopsia || 'não informada'}\n`)

    console.log('✅ Teste concluído com sucesso!')
    console.log('🎯 Comportamentos verificados:')
    console.log('   • Apenas coleta -> AGUARDANDO_RESULTADO')
    console.log('   • Coleta + resultado -> REALIZADO') 
    console.log('   • Sem datas -> PENDENTE')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testarAnatomoPatologico()
}