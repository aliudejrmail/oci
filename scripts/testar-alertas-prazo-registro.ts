import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { DashboardService } from '../src/services/dashboard.service'

const prisma = new PrismaClient()
const dashboardService = new DashboardService(prisma)

async function testarAlertasPrazoRegistro() {
  console.log('🔍 Testando alertas de prazo de registro após correção...\n')

  try {
    // Buscar alertas do dashboard
    const alertas = await dashboardService.obterSolicitacoesProximasPrazoRegistroProcedimentos()

    console.log(`📊 Total de alertas encontrados: ${alertas.length}\n`)

    if (alertas.length === 0) {
      console.log('✅ Nenhum alerta de prazo de registro encontrado')
      console.log('💡 Isso está correto se todas as solicitações já têm procedimentos obrigatórios realizados')
    } else {
      console.log('📋 Alertas de prazo de registro:')
      console.log('-'.repeat(100))
      
      for (const alerta of alertas) {
        console.log(`\n🔔 ${alerta.numeroProtocolo}`)
        console.log(`   Paciente: ${alerta.paciente.nome}`)
        console.log(`   OCI: ${alerta.oci.nome}`)
        console.log(`   Dias restantes: ${alerta.diasRestantesPrazoRegistro}`)
        console.log(`   Status: ${alerta.status}`)
        
        // Verificar procedimentos obrigatórios
        const procedimentosObrigatorios = alerta.oci.procedimentos || []
        console.log(`   Procedimentos obrigatórios: ${procedimentosObrigatorios.length}`)
        
        if (procedimentosObrigatorios.length > 0) {
          console.log(`   Detalhes:`)
          for (const proc of procedimentosObrigatorios) {
            const execucao = alerta.execucoes.find(e => e.procedimento.id === proc.id)
            const status = execucao ? `✅ ${execucao.status}` : '⏳ PENDENTE'
            console.log(`      • ${proc.nome}: ${status}`)
          }
        }
      }
    }

    // Testar especificamente as solicitações problemáticas
    console.log('\n\n🎯 Testando solicitações específicas:')
    console.log('='.repeat(100))

    const protocolosProblematicos = ['OCI-20260204-00005', 'OCI-20260203-00003']
    
    for (const protocolo of protocolosProblematicos) {
      const aparece = alertas.some(a => a.numeroProtocolo === protocolo)
      
      console.log(`\n📋 ${protocolo}:`)
      if (aparece) {
        console.log(`   ❌ AINDA APARECE nos alertas`)
        const alerta = alertas.find(a => a.numeroProtocolo === protocolo)
        if (alerta) {
          console.log(`   Dias restantes: ${alerta.diasRestantesPrazoRegistro}`)
          
          // Verificar procedimentos obrigatórios
          const procedimentosObrigatorios = alerta.oci.procedimentos || []
          console.log(`   Procedimentos obrigatórios pendentes:`)
          for (const proc of procedimentosObrigatorios) {
            const execucao = alerta.execucoes.find(e => e.procedimento.id === proc.id && e.status === 'REALIZADO')
            if (!execucao) {
              console.log(`      • ${proc.nome}`)
            }
          }
        }
      } else {
        console.log(`   ✅ NÃO APARECE nos alertas (correto!)`)
      }
    }

    console.log('\n✅ Teste concluído!')

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarAlertasPrazoRegistro()
  .catch(console.error)
  .finally(() => process.exit(0))