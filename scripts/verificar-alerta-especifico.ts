/**
 * Verifica especificamente por que a solicitação OCI-20260204-00005 ainda mostra alertas
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verificarAlertasEspecifico() {
  console.log('🔍 VERIFICANDO ALERTAS PARA SOLICITAÇÃO OCI-20260204-00005...\n')
  
  try {
    // 1. Buscar a solicitação específica
    const sol = await prisma.solicitacaoOci.findFirst({
      where: {
        numeroProtocolo: 'OCI-20260204-00005'
      },
      include: {
        oci: { select: { nome: true, tipo: true } },
        paciente: { select: { nome: true } }
      }
    })
    
    if (!sol) {
      console.log('❌ Solicitação não encontrada')
      return
    }
    
    console.log(`📋 SOLICITAÇÃO ENCONTRADA:`)
    console.log(`   Protocolo: ${sol.numeroProtocolo}`)
    console.log(`   Status: ${sol.status}`)
    console.log(`   Paciente: ${sol.paciente?.nome}`)
    console.log(`   OCI: ${sol.oci?.nome}`)
    console.log(`   Data conclusão: ${sol.dataConclusao?.toLocaleDateString() ?? 'N/A'}`)
    console.log('')
    
    // 2. Verificar se tem alerta na tabela AlertaPrazo
    const alertaPrazo = await prisma.alertaPrazo.findFirst({
      where: { solicitacaoId: sol.id }
    })
    
    console.log(`⚠️ ALERTA NA TABELA AlertaPrazo:`)
    if (alertaPrazo) {
      console.log(`   ❌ AINDA EXISTE ALERTA ÓRFÃO:`)
      console.log(`   - ID: ${alertaPrazo.id}`)
      console.log(`   - Dias restantes: ${alertaPrazo.diasRestantes}`)
      console.log(`   - Nível: ${alertaPrazo.nivelAlerta}`)
      console.log(`   - Data criação: ${alertaPrazo.dataCriacao?.toLocaleDateString()}`)
    } else {
      console.log(`   ✅ Nenhum alerta encontrado (correto)`)
    }
    console.log('')
    
    // 3. Verificar nas funções de Dashboard
    console.log('🎯 VERIFICANDO FONTES DE ALERTAS NO DASHBOARD:')
    
    // 3.1 - obterAlertasPrazos() 
    const alertasAtivos = await prisma.alertaPrazo.findMany({
      where: {
        solicitacao: {
          numeroProtocolo: 'OCI-20260204-00005'
        }
      },
      include: {
        solicitacao: { select: { status: true, numeroProtocolo: true } }
      }
    })
    
    console.log(`   📊 AlertaPrazo para esta solicitação: ${alertasAtivos.length}`)
    alertasAtivos.forEach(a => {
      console.log(`      - Status solicitação: ${a.solicitacao.status}`)
      console.log(`      - Dias restantes: ${a.diasRestantes}`)
    })
    
    // 3.2 - obterSolicitacoesProximasPrazoRegistroProcedimentos()
    const proximasPrazo = await prisma.solicitacaoOci.findMany({
      where: {
        numeroProtocolo: 'OCI-20260204-00005',
        dataInicioValidadeApac: { not: null },
        competenciaFimApac: { not: null },
        dataEncerramentoApac: null,
        status: { in: ['EM_ANDAMENTO'] }
      }
    })
    
    console.log(`   📅 Próximas prazo registro: ${proximasPrazo.length}`)
    
    // 4. Verificar se aparece nas consultas de alertas do Dashboard
    console.log('\n🔍 VERIFICANDO SE APARECE EM FUNÇÕES DO DASHBOARD:')
    
    // Simular a consulta exata do obterAlertasPrazos()
    const alertasDashboard = await prisma.alertaPrazo.findMany({
      where: {
        solicitacao: {
          status: {
            notIn: ['CONCLUIDA', 'CANCELADA']
          }
        }
      },
      include: {
        solicitacao: {
          select: {
            id: true,
            numeroProtocolo: true,
            status: true
          }
        }
      }
    })
    
    const alertaEspecifico = alertasDashboard.find(a => a.solicitacao.numeroProtocolo === 'OCI-20260204-00005')
    
    if (alertaEspecifico) {
      console.log(`   ❌ APARECE nos alertas do Dashboard:`)
      console.log(`      - Status solicitação: ${alertaEspecifico.solicitacao.status}`)
      console.log(`      - Motivo: Status não é CONCLUIDA nem CANCELADA`)
    } else {
      console.log(`   ✅ NÃO aparece nos alertas do Dashboard`)
    }
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verificarAlertasEspecifico()