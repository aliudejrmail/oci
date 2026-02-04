/**
 * Verifica por que solicitações com todos obrigatórios realizados não são concluídas automaticamente
 */
import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'
import { STATUS_EXECUCAO } from '../src/constants/status-execucao'
import { validarProcedimentosObrigatoriosOci } from '../src/utils/validacao-apac.utils'

const prisma = new PrismaClient()

async function verificarConclusaoAutomatica() {
  console.log('🔍 Verificando lógica de conclusão automática...\n')

  // Buscar solicitações EM_ANDAMENTO com primeiro procedimento executado
  const solicitacoes = await prisma.solicitacaoOci.findMany({
    where: {
      deletedAt: null,
      status: StatusSolicitacao.EM_ANDAMENTO,
      dataInicioValidadeApac: { not: null }
    },
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
      }
    }
  })

  console.log(`📋 Encontradas ${solicitacoes.length} solicitações EM_ANDAMENTO para análise\n`)

  for (const sol of solicitacoes) {
    console.log('─'.repeat(80))
    console.log(`📋 SOLICITAÇÃO: ${sol.numeroProtocolo}`)
    console.log(`   Paciente: ${sol.paciente?.nome}`)
    console.log(`   OCI: ${sol.oci.nome}`)
    console.log('')

    // Analisar procedimentos obrigatórios
    const obrigatorios = sol.oci.procedimentos.filter(p => p.obrigatorio)
    
    console.log(`🔧 PROCEDIMENTOS OBRIGATÓRIOS DA OCI (${obrigatorios.length}):`)
    
    let todosObrigatoriosRealizados = true
    const detalhesObrigatorios = []

    for (const proc of obrigatorios) {
      const execucao = sol.execucoes.find(e => e.procedimentoId === proc.id)
      const status = execucao?.status || 'NÃO INICIADO'
      const realizado = status === STATUS_EXECUCAO.REALIZADO
      
      if (!realizado) {
        todosObrigatoriosRealizados = false
      }

      const icone = realizado ? '✅' : '❌'
      console.log(`   ${icone} ${proc.nome} - ${status}`)
      
      detalhesObrigatorios.push({
        procedimento: proc,
        execucao,
        status,
        realizado
      })
    }

    console.log('')

    // Testar validação usando a função do sistema
    try {
      const execucoesParaValidacao = sol.execucoes.map(exec => ({
        status: exec.status,
        procedimento: { 
          id: exec.procedimento.id, 
          codigo: exec.procedimento.codigo, 
          nome: exec.procedimento.nome 
        }
      }))

      const validacao = validarProcedimentosObrigatoriosOci(obrigatorios, execucoesParaValidacao)

      console.log(`📊 ANÁLISE DE CONCLUSÃO AUTOMÁTICA:`)
      console.log(`   Todos obrigatórios realizados (análise manual): ${todosObrigatoriosRealizados ? 'SIM ✅' : 'NÃO ❌'}`)
      console.log(`   Validação do sistema: ${validacao.valido ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}`)
      
      if (!validacao.valido && validacao.erro) {
        console.log(`   Erro da validação: ${validacao.erro}`)
      }

      if (todosObrigatoriosRealizados && validacao.valido) {
        console.log('')
        console.log(`🚨 PROBLEMA IDENTIFICADO:`)
        console.log(`   → Esta solicitação deveria ter sido concluída automaticamente!`)
        console.log(`   → Todos os procedimentos obrigatórios estão realizados`)
        console.log(`   → Validação do sistema passou`)
        console.log(`   → Mas ainda está com status EM_ANDAMENTO`)
        console.log('')
        console.log(`💡 POSSÍVEIS CAUSAS:`)
        console.log(`   1. Bug na atualização automática de status após registrar procedimento`)
        console.log(`   2. Validação não está sendo executada no momento correto`)
        console.log(`   3. Alguma condição adicional não está sendo atendida`)
      }

    } catch (error) {
      console.log(`❌ Erro na validação: ${error}`)
    }

    console.log('\n')
  }

  // Verificar se há solicitações recém concluídas para comparar
  const recentementeConclidas = await prisma.solicitacaoOci.findMany({
    where: {
      deletedAt: null,
      status: StatusSolicitacao.CONCLUIDA,
      dataConclusao: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
      }
    },
    select: {
      numeroProtocolo: true,
      dataConclusao: true,
      paciente: { select: { nome: true } }
    }
  })

  if (recentementeConclidas.length > 0) {
    console.log('📈 SOLICITAÇÕES CONCLUÍDAS RECENTEMENTE (últimas 24h):')
    for (const sol of recentementeConclidas) {
      console.log(`   ✅ ${sol.numeroProtocolo} - ${sol.paciente?.nome} (${sol.dataConclusao?.toLocaleString('pt-BR')})`)
    }
  }
}

async function main() {
  try {
    await verificarConclusaoAutomatica()
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()