/**
 * Testa especificamente os endpoints que o Dashboard chama
 */
import 'dotenv/config'
import { DashboardService } from '../src/services/dashboard.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dashboardService = new DashboardService(prisma)

async function testarEndpointsDashboard() {
  console.log('🔍 TESTANDO ENDPOINTS DO DASHBOARD...\n')
  
  try {
    // 1. Testar obterAlertasPrazos()
    console.log('1️⃣ TESTANDO obterAlertasPrazos():')
    const alertas = await dashboardService.obterAlertasPrazos()
    const alertaEspecifico = alertas.find((a: any) => 
      a.solicitacao?.numeroProtocolo === 'OCI-20260204-00005'
    )
    
    if (alertaEspecifico) {
      console.log(`   ❌ ENCONTROU a solicitação nos alertas:`)
      console.log(`      - Status: ${alertaEspecifico.solicitacao.status}`)
      console.log(`      - Dias restantes: ${alertaEspecifico.diasRestantes}`)
    } else {
      console.log(`   ✅ NÃO encontrou nos alertas`)
    }
    
    // 2. Testar obterSolicitacoesProximasPrazoRegistroProcedimentos()
    console.log('\n2️⃣ TESTANDO obterSolicitacoesProximasPrazoRegistroProcedimentos():')
    const proximasPrazo = await dashboardService.obterSolicitacoesProximasPrazoRegistroProcedimentos()
    const prazoEspecifico = proximasPrazo.find((s: any) => 
      s.numeroProtocolo === 'OCI-20260204-00005'
    )
    
    if (prazoEspecifico) {
      console.log(`   ❌ ENCONTROU nos prazos de registro:`)
      console.log(`      - Status: ${prazoEspecifico.status}`)
      console.log(`      - Dias restantes: ${prazoEspecifico.diasRestantesPrazoRegistro}`)
      console.log(`      - Data encerramento APAC: ${prazoEspecifico.dataEncerramentoApac}`)
      console.log(`      - Status na query: deveria estar EM_ANDAMENTO apenas`)
    } else {
      console.log(`   ✅ NÃO encontrou nos prazos de registro`)
    }
    
    // 3. Testar obterAlertasResultadoBiopsiaPendente()
    console.log('\n3️⃣ TESTANDO obterAlertasResultadoBiopsiaPendente():')
    const alertasBiopsia = await dashboardService.obterAlertasResultadoBiopsiaPendente()
    const biopsiaEspecifica = alertasBiopsia.find((a: any) => 
      a.solicitacao?.numeroProtocolo === 'OCI-20260204-00005'
    )
    
    if (biopsiaEspecifica) {
      console.log(`   ❌ ENCONTROU nos alertas de biópsia:`)
      console.log(`      - Dias restantes: ${biopsiaEspecifica.diasRestantes}`)
    } else {
      console.log(`   ✅ NÃO encontrou nos alertas de biópsia`)
    }
    
    console.log('\n📊 RESUMO DOS TESTES:')
    console.log(`   Alertas gerais: ${alertas.length} total`)
    console.log(`   Prazos registro: ${proximasPrazo.length} total`)  
    console.log(`   Alertas biópsia: ${alertasBiopsia.length} total`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarEndpointsDashboard()