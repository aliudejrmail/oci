/**
 * Verifica o estado atual de todos os tipos de alertas no sistema
 */
import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'

const prisma = new PrismaClient()

async function verificarTodosAlertas() {
  console.log('🔍 Verificando estado de todos os tipos de alertas no sistema...\n')

  // 1. VERIFICAR ALERTAS DA TABELA ALERTA_PRAZO
  console.log('📊 1. ALERTAS DA TABELA ALERTA_PRAZO:')
  console.log('─'.repeat(80))
  
  const alertasTabela = await prisma.alertaPrazo.findMany({
    include: {
      solicitacao: {
        select: {
          numeroProtocolo: true,
          status: true,
          dataConclusao: true
        }
      }
    }
  })

  console.log(`Total de alertas na tabela: ${alertasTabela.length}`)
  
  if (alertasTabela.length > 0) {
    console.log('\nDetalhes dos alertas:')
    for (const alerta of alertasTabela) {
      const statusIcon = alerta.solicitacao.status === 'CONCLUIDA' ? '❌ PROBLEMA:' : '✅ OK:'
      console.log(`${statusIcon} ${alerta.solicitacao.numeroProtocolo} (${alerta.solicitacao.status}) - ${alerta.diasRestantes}d restantes`)
    }
  }
  console.log('')

  // 2. VERIFICAR ALERTAS DE RESULTADO DE BIOPSIA
  console.log('📊 2. ALERTAS DE RESULTADO DE BIÓPSIA:')
  console.log('─'.repeat(80))
  
  const alertasBiopsia = await prisma.execucaoProcedimento.findMany({
    where: {
      dataColetaMaterialBiopsia: { not: null },
      dataRegistroResultadoBiopsia: null,
      procedimento: { obrigatorio: true },
      solicitacao: {
        status: {
          notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
        }
      }
    },
    include: {
      solicitacao: {
        select: {
          numeroProtocolo: true,
          status: true,
          dataConclusao: true
        }
      },
      procedimento: {
        select: {
          nome: true
        }
      }
    }
  })

  console.log(`Total de alertas de biópsia: ${alertasBiopsia.length}`)
  
  if (alertasBiopsia.length > 0) {
    console.log('\nDetalhes dos alertas de biópsia:')
    for (const exec of alertasBiopsia) {
      const isAnatomo = exec.procedimento.nome.toLowerCase().includes('anatomo') && 
                       exec.procedimento.nome.toLowerCase().includes('patol')
      if (isAnatomo) {
        console.log(`🧬 ${exec.solicitacao.numeroProtocolo} (${exec.solicitacao.status}) - ${exec.procedimento.nome}`)
        console.log(`   Coleta: ${exec.dataColetaMaterialBiopsia?.toLocaleDateString('pt-BR')} | Resultado: pendente`)
      }
    }
  }
  console.log('')

  // 3. VERIFICAR ALERTAS DE PRAZO PARA REGISTRO DE PROCEDIMENTOS
  console.log('📊 3. ALERTAS DE PRAZO PARA REGISTRO DE PROCEDIMENTOS:')
  console.log('─'.repeat(80))
  
  const alertasRegistro = await prisma.solicitacaoOci.findMany({
    where: {
      dataInicioValidadeApac: { not: null },
      competenciaFimApac: { not: null },
      dataEncerramentoApac: null,
      status: {
        in: [StatusSolicitacao.EM_ANDAMENTO]
      }
    },
    select: {
      numeroProtocolo: true,
      status: true,
      dataConclusao: true,
      competenciaFimApac: true,
      dataInicioValidadeApac: true,
      oci: {
        select: { tipo: true }
      }
    }
  })

  console.log(`Total de alertas de registro: ${alertasRegistro.length}`)
  
  if (alertasRegistro.length > 0) {
    console.log('\nDetalhes dos alertas de registro:')
    for (const sol of alertasRegistro) {
      console.log(`📅 ${sol.numeroProtocolo} (${sol.status}) - Competência: ${sol.competenciaFimApac}`)
    }
  }
  console.log('')

  // 4. RESUMO GERAL
  console.log('📈 RESUMO GERAL:')
  console.log('─'.repeat(80))
  console.log(`• Alertas na tabela AlertaPrazo: ${alertasTabela.length}`)
  console.log(`• Alertas de resultado de biópsia: ${alertasBiopsia.filter(e => 
    e.procedimento.nome.toLowerCase().includes('anatomo') && 
    e.procedimento.nome.toLowerCase().includes('patol')).length}`)
  console.log(`• Alertas de prazo para registro: ${alertasRegistro.length}`)
  
  const alertasProblematicos = alertasTabela.filter(a => a.solicitacao.status === 'CONCLUIDA')
  if (alertasProblematicos.length > 0) {
    console.log(`\n❌ PROBLEMAS ENCONTRADOS:`)
    console.log(`• ${alertasProblematicos.length} alerta(s) órfão(s) de solicitações concluídas`)
    console.log(`• Execute o script de limpeza: npx ts-node scripts/limpar-alertas-orfaos.ts`)
  } else {
    console.log(`\n✅ Nenhum problema encontrado com alertas órfãos`)
  }
}

async function main() {
  try {
    await verificarTodosAlertas()
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()