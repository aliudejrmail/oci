/**
 * Verifica TODAS as possíveis fontes de alertas para uma solicitação específica
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { DashboardService } from '../src/services/dashboard.service'

const prisma = new PrismaClient()
const dashboardService = new DashboardService(prisma)

async function verificarTodasFontesAlertas(numeroProtocolo: string = 'OCI-20260204-00005') {
  console.log(`🔍 VERIFICANDO TODAS AS FONTES DE ALERTAS PARA: ${numeroProtocolo}\n`)

  try {
    // 1. Verificar na tabela AlertaPrazo
    console.log('1️⃣ TABELA AlertaPrazo:')
    const alertaTabela = await prisma.alertaPrazo.findFirst({
      where: {
        solicitacao: {
          numeroProtocolo
        }
      },
      include: {
        solicitacao: {
          select: {
            numeroProtocolo: true,
            status: true
          }
        }
      }
    })

    if (alertaTabela) {
      console.log(`   ❌ ENCONTRADO na tabela AlertaPrazo:`)
      console.log(`      - Status solicitação: ${alertaTabela.solicitacao.status}`)
      console.log(`      - Dias restantes: ${alertaTabela.diasRestantes}`)
      console.log(`      - Nível: ${alertaTabela.nivelAlerta}`)
    } else {
      console.log(`   ✅ NÃO encontrado na tabela AlertaPrazo`)
    }

    // 2. Verificar função obterAlertasPrazos (Dashboard principal)
    console.log('\n2️⃣ FUNÇÃO obterAlertasPrazos():')
    const alertasDashboard = await dashboardService.obterAlertasPrazos()
    const alertaEspecifico = alertasDashboard.find((a: any) => 
      a.solicitacao?.numeroProtocolo === numeroProtocolo
    )
    
    if (alertaEspecifico) {
      console.log(`   ❌ ENCONTRADO nos alertas do Dashboard:`)
      console.log(`      - Status solicitação: ${alertaEspecifico.solicitacao.status}`)
      console.log(`      - Dias restantes: ${alertaEspecifico.diasRestantes}`)
      console.log(`      - Tipo prazo: ${alertaEspecifico.tipoPrazo}`)
    } else {
      console.log(`   ✅ NÃO encontrado nos alertas do Dashboard`)
    }

    // 3. Verificar função obterSolicitacoesProximasPrazoRegistroProcedimentos
    console.log('\n3️⃣ FUNÇÃO obterSolicitacoesProximasPrazoRegistroProcedimentos():')
    const alertasRegistro = await dashboardService.obterSolicitacoesProximasPrazoRegistroProcedimentos()
    const registroEspecifico = alertasRegistro.find((a: any) => 
      a.numeroProtocolo === numeroProtocolo
    )
    
    if (registroEspecifico) {
      console.log(`   ❌ ENCONTRADO nos alertas de registro:`)
      console.log(`      - Status: ${registroEspecifico.status}`)
      console.log(`      - Dias restantes: ${registroEspecifico.diasRestantesPrazoRegistro}`)
    } else {
      console.log(`   ✅ NÃO encontrado nos alertas de registro`)
    }

    // 4. Verificar função obterAlertasResultadoBiopsiaPendente
    console.log('\n4️⃣ FUNÇÃO obterAlertasResultadoBiopsiaPendente():')
    const alertasBiopsia = await dashboardService.obterAlertasResultadoBiopsiaPendente()
    const biopsiaEspecifica = alertasBiopsia.find((a: any) => 
      a.solicitacao?.numeroProtocolo === numeroProtocolo
    )
    
    if (biopsiaEspecifica) {
      console.log(`   ❌ ENCONTRADO nos alertas de biópsia:`)
      console.log(`      - Status solicitação: ${biopsiaEspecifica.solicitacao.status}`)
      console.log(`      - Dias restantes: ${biopsiaEspecifica.diasRestantes}`)
    } else {
      console.log(`   ✅ NÃO encontrado nos alertas de biópsia`)
    }

    // 5. Verificar dados brutos da solicitação
    console.log('\n5️⃣ DADOS BRUTOS DA SOLICITAÇÃO:')
    const solicitacao = await prisma.solicitacaoOci.findUnique({
      where: { numeroProtocolo },
      include: {
        alerta: true,
        oci: { select: { tipo: true } }
      }
    })

    if (solicitacao) {
      console.log(`   📋 Status: ${solicitacao.status}`)
      console.log(`   📅 Data conclusão: ${solicitacao.dataConclusao?.toLocaleString('pt-BR') || 'N/A'}`)
      console.log(`   📊 Competência fim: ${solicitacao.competenciaFimApac || 'N/A'}`)
      console.log(`   🔗 Tem alerta vinculado: ${solicitacao.alerta ? 'SIM' : 'NÃO'}`)
      
      if (solicitacao.alerta) {
        console.log(`      - Dias restantes: ${solicitacao.alerta.diasRestantes}`)
        console.log(`      - Nível: ${solicitacao.alerta.nivelAlerta}`)
      }
    } else {
      console.log(`   ❌ Solicitação não encontrada`)
    }

    // 6. Verificar se aparece na listagem principal de solicitações (como aparece na tela)
    console.log('\n6️⃣ LISTAGEM DE SOLICITAÇÕES (como no frontend):')
    const solicitacaoComAlerta = await prisma.solicitacaoOci.findUnique({
      where: { numeroProtocolo },
      include: {
        paciente: { select: { nome: true } },
        oci: { select: { nome: true, tipo: true } },
        alerta: true
      }
    })

    if (solicitacaoComAlerta) {
      console.log(`   📋 ${solicitacaoComAlerta.numeroProtocolo} - ${solicitacaoComAlerta.paciente?.nome}`)
      console.log(`   📊 Status: ${solicitacaoComAlerta.status}`)
      
      if (solicitacaoComAlerta.alerta) {
        console.log(`   🚨 ALERTA ATIVO:`)
        console.log(`      - Dias restantes: ${solicitacaoComAlerta.alerta.diasRestantes}`)
        console.log(`      - Nível: ${solicitacaoComAlerta.alerta.nivelAlerta}`)
        console.log(`   → ESTE É O PROBLEMA: Alerta ativo para solicitação ${solicitacaoComAlerta.status}`)
      } else {
        console.log(`   ✅ Sem alertas ativos`)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await verificarTodasFontesAlertas()
}

main()