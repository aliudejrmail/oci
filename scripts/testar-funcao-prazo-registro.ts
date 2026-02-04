/**
 * Testa especificamente a função obterSolicitacoesProximasPrazoRegistroProcedimentos
 * para verificar se ainda está retornando solicitações concluídas
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { DashboardService } from '../src/services/dashboard.service'

const prisma = new PrismaClient()
const dashboardService = new DashboardService(prisma)

async function testarFuncaoPrazoRegistro() {
  console.log('🔍 TESTANDO obterSolicitacoesProximasPrazoRegistroProcedimentos()...\n')
  
  try {
    const resultado = await dashboardService.obterSolicitacoesProximasPrazoRegistroProcedimentos()
    
    console.log(`📊 Total de alertas retornados: ${resultado.length}`)
    console.log('')
    
    if (resultado.length === 0) {
      console.log('✅ Nenhuma solicitação próxima do prazo de registro encontrada')
      return
    }
    
    console.log('📋 SOLICITAÇÕES ENCONTRADAS:')
    console.log('─'.repeat(80))
    
    for (const sol of resultado) {
      console.log(`📝 ${sol.numeroProtocolo}`)
      console.log(`   Paciente: ${sol.paciente?.nome}`)
      console.log(`   Status: ${sol.status}`)
      console.log(`   Dias restantes: ${sol.diasRestantesPrazoRegistro}`)
      console.log(`   Data fim validade: ${sol.dataFimValidadeApac?.toLocaleDateString('pt-BR')}`)
      console.log('')
      
      // Verificar se é a solicitação problema
      if (sol.numeroProtocolo === 'OCI-20260204-00005') {
        console.log('❌ PROBLEMA: Esta solicitação deveria estar CONCLUÍDA!')
        console.log(`   → Verificar se o status realmente foi atualizado no banco`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar função:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await testarFuncaoPrazoRegistro()
}

main()