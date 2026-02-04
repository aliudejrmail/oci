/**
 * Busca solicitações com muitos procedimentos realizados para simular o caso da imagem
 */
import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'

const prisma = new PrismaClient()

async function buscarSolicitacoesComMuitosRealizados() {
  console.log('🔍 Buscando solicitações com muitos procedimentos realizados...\n')

  const solicitacoes = await prisma.solicitacaoOci.findMany({
    where: {
      deletedAt: null,
      status: {
        notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
      },
      dataInicioValidadeApac: { not: null }
    },
    include: {
      paciente: { select: { nome: true, cpf: true } },
      oci: { select: { codigo: true, nome: true, tipo: true } },
      execucoes: {
        select: { 
          id: true, 
          status: true, 
          procedimento: { select: { nome: true, obrigatorio: true } }
        }
      }
    }
  })

  // Calcular estatísticas para cada solicitação
  const estatisticas = solicitacoes.map(sol => {
    const totalProcedimentos = sol.execucoes.length
    const realizados = sol.execucoes.filter(e => e.status === STATUS_EXECUCAO.REALIZADO).length
    const pendentes = totalProcedimentos - realizados
    const percentualRealizado = Math.round((realizados / totalProcedimentos) * 100)
    
    const obrigatoriosTotal = sol.execucoes.filter(e => e.procedimento.obrigatorio).length
    const obrigatoriosRealizados = sol.execucoes.filter(e => 
      e.procedimento.obrigatorio && e.status === STATUS_EXECUCAO.REALIZADO
    ).length
    const obrigatoriosPendentes = obrigatoriosTotal - obrigatoriosRealizados

    return {
      numeroProtocolo: sol.numeroProtocolo,
      pacienteNome: sol.paciente?.nome || 'N/A',
      ociNome: sol.oci.nome,
      ociTipo: sol.oci.tipo,
      status: sol.status,
      totalProcedimentos,
      realizados,
      pendentes,
      percentualRealizado,
      obrigatoriosTotal,
      obrigatoriosRealizados,
      obrigatoriosPendentes
    }
  })

  // Ordenar por número de realizados (decrescente)
  estatisticas.sort((a, b) => b.realizados - a.realizados)

  // Exibir top 10
  console.log('📊 TOP 10 SOLICITAÇÕES COM MAIS PROCEDIMENTOS REALIZADOS:')
  console.log('─'.repeat(120))
  console.log(
    'Protocolo'.padEnd(20) + 
    'Paciente'.padEnd(30) + 
    'Real/Total'.padEnd(12) + 
    'Obrig R/T'.padEnd(12) + 
    '%'.padEnd(6) + 
    'Status'
  )
  console.log('─'.repeat(120))

  for (let i = 0; i < Math.min(10, estatisticas.length); i++) {
    const e = estatisticas[i]
    console.log(
      e.numeroProtocolo.padEnd(20) +
      (e.pacienteNome.substring(0, 28) + (e.pacienteNome.length > 28 ? '...' : '')).padEnd(30) +
      `${e.realizados}/${e.totalProcedimentos}`.padEnd(12) +
      `${e.obrigatoriosRealizados}/${e.obrigatoriosTotal}`.padEnd(12) +
      `${e.percentualRealizado}%`.padEnd(6) +
      e.status
    )
  }

  console.log('\n')

  // Identificar casos que podem estar com problema similar ao da imagem
  const casosProblematicos = estatisticas.filter(e => 
    e.realizados >= 3 && // Tem pelo menos 3 procedimentos realizados
    e.obrigatoriosPendentes === 0 && // Todos obrigatórios estão realizados
    e.status === StatusSolicitacao.EM_ANDAMENTO // Mas ainda está EM_ANDAMENTO
  )

  if (casosProblematicos.length > 0) {
    console.log('⚠️  CASOS PROBLEMÁTICOS (obrigatórios realizados mas ainda EM_ANDAMENTO):')
    console.log('─'.repeat(80))
    
    for (const caso of casosProblematicos) {
      console.log(`📋 ${caso.numeroProtocolo} - ${caso.pacienteNome}`)
      console.log(`   Status: ${caso.status} | Realizados: ${caso.realizados}/${caso.totalProcedimentos}`)
      console.log(`   Obrigatórios: ${caso.obrigatoriosRealizados}/${caso.obrigatoriosTotal} ✅`)
      console.log(`   → Possível solução: Marcar manualmente como CONCLUÍDA`)
      console.log()
    }
  }

  return estatisticas
}

async function main() {
  try {
    await buscarSolicitacoesComMuitosRealizados()
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()