import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { SolicitacoesService } from '../src/services/solicitacoes.service'

const prisma = new PrismaClient()
const solicitacoesService = new SolicitacoesService(prisma)

async function testarListagemSolicitacoes() {
  console.log('🔍 Testando alertas na listagem de solicitações...\n')

  try {
    // Buscar todas as solicitações
    const resultado = await solicitacoesService.listarSolicitacoes({
      status: 'EM_ANDAMENTO'
    })

    const solicitacoes = resultado.solicitacoes || []

    console.log(`📊 Total de solicitações EM_ANDAMENTO: ${solicitacoes.length}\n`)

    // Focar nas solicitações problemáticas
    const protocolosProblematicos = ['OCI-20260204-00005', 'OCI-20260203-00003']

    console.log('🎯 Verificando solicitações específicas:')
    console.log('='.repeat(100))

    for (const protocolo of protocolosProblematicos) {
      const sol = solicitacoes.find((s: any) => s.numeroProtocolo === protocolo)

      if (!sol) {
        console.log(`\n📋 ${protocolo}: NÃO ENCONTRADA`)
        continue
      }

      console.log(`\n📋 ${protocolo}`)
      console.log(`   Paciente: ${sol.paciente.nome}`)
      console.log(`   Status: ${sol.status}`)
      console.log(`   Competência Fim APAC: ${sol.competenciaFimApac || 'N/A'}`)

      // Verificar procedimentos obrigatórios
      const procedimentosObrigatorios = sol.oci?.procedimentos || []
      console.log(`   Procedimentos obrigatórios: ${procedimentosObrigatorios.length}`)

      if (procedimentosObrigatorios.length > 0) {
        console.log(`   Detalhes:`)
        for (const proc of procedimentosObrigatorios) {
          const execucao = sol.execucoes?.find((e: any) => e.procedimento.id === proc.id)
          const status = execucao ? `${execucao.status}` : 'NÃO ENCONTRADO'
          const realizado = execucao?.status === 'REALIZADO' ? '✅' : '⏳'
          console.log(`      ${realizado} ${proc.nome}: ${status}`)
        }

        const todosRealizados = procedimentosObrigatorios.every((proc: any) => {
          return sol.execucoes?.some((e: any) => 
            e.procedimento.id === proc.id && e.status === 'REALIZADO'
          )
        })

        console.log(`   Todos obrigatórios realizados: ${todosRealizados ? '✅ SIM' : '❌ NÃO'}`)
      }

      // Verificar se tem alerta
      console.log(`\n   ALERTA:`)
      if (sol.alerta && sol.alerta.diasRestantes !== undefined) {
        console.log(`      ❌ ALERTA ATIVO`)
        console.log(`      Dias restantes: ${sol.alerta.diasRestantes}`)
        console.log(`      Nível: ${sol.alerta.nivelAlerta}`)
        console.log(`      ⚠️  PROBLEMA: Alerta exibido mesmo com obrigatórios realizados!`)
      } else {
        console.log(`      ✅ SEM ALERTA (correto se obrigatórios realizados)`)
      }
    }

    // Verificar também outras solicitações
    console.log('\n\n📊 Resumo de TODAS as solicitações EM_ANDAMENTO:')
    console.log('-'.repeat(100))

    let comAlerta = 0
    let semAlerta = 0

    for (const sol of solicitacoes) {
      if (sol.alerta && sol.alerta.diasRestantes !== undefined) {
        comAlerta++
      } else {
        semAlerta++
      }
    }

    console.log(`   Com alertas de dias restantes: ${comAlerta}`)
    console.log(`   Sem alertas: ${semAlerta}`)

    console.log('\n✅ Teste concluído!')

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarListagemSolicitacoes()
  .catch(console.error)
  .finally(() => process.exit(0))