/**
 * Analisa uma solicitação específica para entender por que ainda está mostrando alertas
 * mesmo com a maioria dos procedimentos realizados.
 */
import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'
import { 
  calcularDiasRestantes, 
  dataLimiteRegistroOncologico, 
  dataFimCompetencia,
  determinarNivelAlerta
} from '../src/utils/date.utils'

const prisma = new PrismaClient()

async function analisarSolicitacao(numeroProtocolo?: string) {
  console.log(`🔍 Analisando alertas de procedimentos...`)
  
  if (numeroProtocolo) {
    console.log(`   → Solicitação específica: ${numeroProtocolo}`)
  } else {
    console.log(`   → Buscando solicitações com alertas ativos`)
  }
  console.log('')

  // Buscar solicitação específica ou as que têm alertas
  const where: any = {
    deletedAt: null,
    status: {
      notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
    }
  }

  if (numeroProtocolo) {
    where.numeroProtocolo = numeroProtocolo
  } else {
    // Buscar solicitações com primeiro procedimento executado e com competência
    where.dataInicioValidadeApac = { not: null }
    where.competenciaFimApac = { not: null }
  }

  const solicitacoes = await prisma.solicitacaoOci.findMany({
    where,
    include: {
      paciente: { select: { nome: true, cpf: true } },
      oci: { 
        select: { 
          codigo: true, 
          nome: true, 
          tipo: true,
          procedimentos: {
            select: { 
              id: true, 
              codigo: true, 
              nome: true, 
              obrigatorio: true 
            },
            orderBy: { ordem: 'asc' }
          }
        } 
      },
      execucoes: {
        include: {
          procedimento: { 
            select: { 
              id: true, 
              codigo: true, 
              nome: true, 
              obrigatorio: true 
            } 
          }
        },
        orderBy: { id: 'asc' }
      },
      alerta: true
    }
  })

  if (solicitacoes.length === 0) {
    console.log('❌ Nenhuma solicitação encontrada com os critérios especificados.')
    return
  }

  for (const sol of solicitacoes) {
    console.log('═'.repeat(80))
    console.log(`📋 SOLICITAÇÃO: ${sol.numeroProtocolo}`)
    console.log(`   Paciente: ${sol.paciente?.nome}`)
    console.log(`   OCI: ${sol.oci.nome} (${sol.oci.tipo})`)
    console.log(`   Status: ${sol.status}`)
    console.log('')

    // Calcular prazo de registro
    const tipoOci = sol.oci.tipo as 'GERAL' | 'ONCOLOGICO'
    const dataLimite = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
      ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac!)
      : dataFimCompetencia(sol.competenciaFimApac!)
    
    const diasRestantes = calcularDiasRestantes(dataLimite)
    const nivelAlerta = determinarNivelAlerta(diasRestantes, tipoOci)

    console.log(`📅 PRAZOS:`)
    console.log(`   Data limite registro: ${dataLimite.toLocaleDateString('pt-BR')}`)
    console.log(`   Dias restantes: ${diasRestantes} (${nivelAlerta})`)
    console.log(`   Competência fim APAC: ${sol.competenciaFimApac}`)
    console.log('')

    // Analisar procedimentos
    const obrigatorios = sol.oci.procedimentos.filter(p => p.obrigatorio)
    const execucoesRealizadas = sol.execucoes.filter(e => e.status === STATUS_EXECUCAO.REALIZADO)
    const execucoesPendentes = sol.execucoes.filter(e => e.status !== STATUS_EXECUCAO.REALIZADO)

    console.log(`🔧 PROCEDIMENTOS:`)
    console.log(`   Total na OCI: ${sol.oci.procedimentos.length}`)
    console.log(`   Obrigatórios: ${obrigatorios.length}`)
    console.log(`   Execuções realizadas: ${execucoesRealizadas.length}`)
    console.log(`   Execuções pendentes: ${execucoesPendentes.length}`)
    console.log('')

    // Verificar quais obrigatórios estão pendentes
    const obrigatoriosPendentes = []
    for (const proc of obrigatorios) {
      const execucao = sol.execucoes.find(e => e.procedimentoId === proc.id)
      if (!execucao || execucao.status !== STATUS_EXECUCAO.REALIZADO) {
        obrigatoriosPendentes.push({
          procedimento: proc,
          execucao: execucao || null
        })
      }
    }

    if (obrigatoriosPendentes.length > 0) {
      console.log(`❌ OBRIGATÓRIOS PENDENTES (${obrigatoriosPendentes.length}):`)
      for (const item of obrigatoriosPendentes) {
        const status = item.execucao?.status || 'NÃO INICIADO'
        console.log(`   • ${item.procedimento.nome} - ${status}`)
      }
      console.log('')
    } else {
      console.log(`✅ Todos os procedimentos obrigatórios estão realizados!`)
      console.log('')
    }

    // Detalhar execuções por status
    console.log(`📊 DETALHES DAS EXECUÇÕES:`)
    const statusCount: Record<string, number> = {}
    
    for (const exec of sol.execucoes) {
      const status = exec.status
      statusCount[status] = (statusCount[status] || 0) + 1
      
      const isObrigatorio = exec.procedimento.obrigatorio ? '🔴' : '🔵'
      const dataExec = exec.dataExecucao ? exec.dataExecucao.toLocaleDateString('pt-BR') : '-'
      
      console.log(`   ${isObrigatorio} ${exec.procedimento.nome}`)
      console.log(`     Status: ${status} | Data: ${dataExec}`)
    }
    
    console.log('')
    console.log(`📈 RESUMO POR STATUS:`)
    for (const [status, count] of Object.entries(statusCount)) {
      console.log(`   ${status}: ${count}`)
    }
    console.log('')

    // Verificar por que não está CONCLUIDA
    console.log(`🤔 ANÁLISE DO STATUS:`)
    if (sol.status === StatusSolicitacao.EM_ANDAMENTO) {
      if (obrigatoriosPendentes.length === 0) {
        console.log(`   ⚠️  Todos os obrigatórios estão realizados, mas a solicitação não foi marcada como CONCLUÍDA!`)
        console.log(`   → Possível solução: Marcar manualmente como CONCLUÍDA na interface.`)
      } else {
        console.log(`   ⏳ Aguardando realização de ${obrigatoriosPendentes.length} procedimento(s) obrigatório(s).`)
      }
    }
    
    if (diasRestantes <= 7) {
      console.log(`   🚨 ALERTA ATIVO: Prazo para registro próximo (${diasRestantes} dias).`)
      console.log(`   → O sistema mostra este alerta até que a solicitação seja CONCLUÍDA.`)
    }

    console.log('')
  }
}

async function main() {
  try {
    // Pode passar um número de protocolo específico como argumento
    const numeroProtocolo = process.argv[2]
    await analisarSolicitacao(numeroProtocolo)
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()