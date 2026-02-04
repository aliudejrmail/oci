import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'

// Script para reverter solicitações CONCLUÍDAS para EM_ANDAMENTO no ambiente de produção
// ATENÇÃO: Este script altera dados de produção!

async function reverterSolicitacoesConcluidas() {
  console.log('🔄 Script de Reversão de Status - AMBIENTE DE PRODUÇÃO')
  console.log('=' .repeat(60))
  console.log('⚠️  ATENÇÃO: Este script irá alterar dados de produção!')
  console.log('')

  // Usar URL de produção do Neon/Render
  const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente')
    console.log('💡 Certifique-se de que DATABASE_URL está configurada no .env')
    return
  }

  console.log('🔗 Conectando no banco de produção...')
  console.log(`📍 Host: ${DATABASE_URL.includes('neon.tech') ? 'Neon PostgreSQL (Produção)' : 'PostgreSQL'}`)

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  })

  try {
    // 1. Verificar conexão
    await prisma.$connect()
    console.log('✅ Conectado ao banco de produção')

    // 2. Listar solicitações concluídas
    console.log('\n📋 Buscando solicitações com status CONCLUÍDA...')
    
    const solicitacoesConcluidas = await prisma.solicitacaoOci.findMany({
      where: {
        status: StatusSolicitacao.CONCLUIDA,
        deletedAt: null
      },
      select: {
        id: true,
        numeroProtocolo: true,
        dataConclusao: true,
        numeroAutorizacaoApac: true,
        paciente: {
          select: { nome: true }
        },
        oci: {
          select: { nome: true }
        }
      },
      orderBy: {
        dataConclusao: 'desc'
      }
    })

    console.log(`📊 Encontradas ${solicitacoesConcluidas.length} solicitações concluídas`)

    if (solicitacoesConcluidas.length === 0) {
      console.log('✅ Nenhuma solicitação concluída encontrada')
      return
    }

    // 3. Mostrar lista das solicitações
    console.log('\n📝 Lista das solicitações a serem revertidas:')
    console.log('-'.repeat(100))
    console.log('Protocolo'.padEnd(20) + 'Paciente'.padEnd(25) + 'OCI'.padEnd(30) + 'APAC'.padEnd(15) + 'Data Conclusão')
    console.log('-'.repeat(100))

    for (const sol of solicitacoesConcluidas) {
      const protocolo = sol.numeroProtocolo.padEnd(20)
      const paciente = (sol.paciente.nome.substring(0, 22) + '...').padEnd(25)
      const oci = (sol.oci.nome.substring(0, 27) + '...').padEnd(30)
      const apac = (sol.numeroAutorizacaoApac || 'N/A').padEnd(15)
      const data = sol.dataConclusao ? new Date(sol.dataConclusao).toLocaleDateString('pt-BR') : 'N/A'
      
      console.log(`${protocolo}${paciente}${oci}${apac}${data}`)
    }

    // 4. Confirmação de segurança
    console.log('\n⚠️  CONFIRMAÇÃO DE SEGURANÇA:')
    console.log(`   → ${solicitacoesConcluidas.length} solicitações serão alteradas de CONCLUÍDA para EM_ANDAMENTO`)
    console.log(`   → Os campos dataConclusao serão limpos`)
    console.log(`   → Os números APAC serão preservados`)
    console.log('')
    console.log('🛑 Esta operação NÃO PODE SER DESFEITA automaticamente!')
    console.log('')
    console.log('Digite "CONFIRMAR REVERSAO PRODUCAO" para prosseguir:')

    // Simular confirmação (em produção real, usar readline)
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const confirmacao = await new Promise<string>((resolve) => {
      rl.question('> ', (answer: string) => {
        rl.close()
        resolve(answer.trim())
      })
    })

    if (confirmacao !== 'CONFIRMAR REVERSAO PRODUCAO') {
      console.log('❌ Operação cancelada pelo usuário')
      return
    }

    // 5. Executar reversão
    console.log('\n🔄 Executando reversão...')
    
    let sucessos = 0
    let erros = 0

    for (const sol of solicitacoesConcluidas) {
      try {
        await prisma.solicitacaoOci.update({
          where: { id: sol.id },
          data: {
            status: StatusSolicitacao.EM_ANDAMENTO,
            dataConclusao: null
            // Preservar numeroAutorizacaoApac e outros campos APAC
          }
        })
        
        console.log(`✅ ${sol.numeroProtocolo} → EM_ANDAMENTO`)
        sucessos++
        
      } catch (error) {
        console.error(`❌ Erro em ${sol.numeroProtocolo}:`, (error as any).message)
        erros++
      }
    }

    // 6. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:')
    console.log(`✅ Sucessos: ${sucessos}`)
    console.log(`❌ Erros: ${erros}`)
    console.log(`📊 Total processado: ${sucessos + erros}`)

    if (sucessos > 0) {
      console.log('\n🎯 REVERSÃO CONCLUÍDA COM SUCESSO!')
      console.log('💡 As solicitações agora estão EM_ANDAMENTO e podem ser concluídas novamente')
      console.log('💡 Os números APAC foram preservados')
      console.log('💡 Usuários precisarão marcar como concluída manualmente')
    }

    if (erros > 0) {
      console.log('\n⚠️  Alguns erros ocorreram. Verifique os logs acima.')
    }

  } catch (error) {
    console.error('\n❌ Erro na operação:', error)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Desconectado do banco de produção')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  reverterSolicitacoesConcluidas()
    .then(() => {
      console.log('\n✅ Script finalizado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error)
      process.exit(1)
    })
}

export { reverterSolicitacoesConcluidas }