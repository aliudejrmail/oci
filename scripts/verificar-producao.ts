import 'dotenv/config'
import fetch from 'node-fetch'

// Script para verificar solicitações via API do Render
async function verificarSolicitacoesProducao() {
  console.log('🔍 Verificando solicitações no ambiente de produção...\n')

  const baseURL = 'https://oci-ko34.onrender.com'
  
  try {
    // 1. Testar se API está respondendo
    console.log('1. Testando conexão com API de produção...')
    const healthCheck = await fetch(`${baseURL}/api/dashboard/estatisticas?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!healthCheck.ok) {
      throw new Error(`API retornou status ${healthCheck.status}`)
    }

    console.log('✅ API de produção respondendo')

    // 2. Buscar estatísticas gerais
    console.log('\n2. Obtendo estatísticas gerais...')
    const stats = await healthCheck.json() as any
    
    console.log(`📊 Estatísticas de Produção:`)
    console.log(`   Total de solicitações: ${stats.totalSolicitacoes || 'N/A'}`)
    
    if (stats.porStatus) {
      console.log(`   Status atual:`)
      console.log(`   • Pendentes: ${stats.porStatus.pendentes || 0}`)
      console.log(`   • Em Andamento: ${stats.porStatus.emAndamento || 0}`)
      console.log(`   • Concluídas: ${stats.porStatus.concluidas || 0}`)
      console.log(`   • Vencidas: ${stats.porStatus.vencidas || 0}`)
      console.log(`   • Canceladas: ${stats.porStatus.canceladas || 0}`)
    }

    // 3. Listar solicitações (amostra)
    console.log('\n3. Obtendo amostra de solicitações...')
    
    try {
      const solicitacoesResponse = await fetch(`${baseURL}/api/solicitacoes?_t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (solicitacoesResponse.ok) {
        const data = await solicitacoesResponse.json() as any
        const solicitacoes = data.solicitacoes || data || []
        
        console.log(`📋 Encontradas ${solicitacoes.length} solicitações`)
        
        if (solicitacoes.length > 0) {
          const concluidas = solicitacoes.filter((s: any) => s.status === 'CONCLUIDA')
          const emAndamento = solicitacoes.filter((s: any) => s.status === 'EM_ANDAMENTO')
          
          console.log(`   • Concluídas: ${concluidas.length}`)
          console.log(`   • Em Andamento: ${emAndamento.length}`)
          
          if (concluidas.length > 0) {
            console.log('\n📝 Amostra de solicitações CONCLUÍDAS (últimas 5):')
            console.log('-'.repeat(80))
            
            concluidas.slice(0, 5).forEach((sol: any) => {
              const protocolo = sol.numeroProtocolo || 'N/A'
              const paciente = sol.paciente?.nome || 'N/A'
              const apac = sol.numeroAutorizacaoApac || 'Sem APAC'
              const data = sol.dataConclusao ? new Date(sol.dataConclusao).toLocaleDateString('pt-BR') : 'N/A'
              
              console.log(`${protocolo.padEnd(20)} | ${paciente.substring(0, 20).padEnd(22)} | ${apac.padEnd(15)} | ${data}`)
            })
          }
        }
      } else {
        console.log(`⚠️  Não foi possível acessar lista de solicitações (${solicitacoesResponse.status})`)
      }
      
    } catch (error) {
      console.log(`⚠️  Erro ao buscar solicitações: ${(error as any).message}`)
    }

    console.log('\n🎯 Verificação concluída!')
    console.log('\n💡 Para reverter as solicitações concluídas, execute:')
    console.log('   npx ts-node scripts/reverter-solicitacoes-producao.ts')

  } catch (error) {
    console.error('\n❌ Erro na verificação:', (error as any).message)
    
    if ((error as any).message.includes('401')) {
      console.log('💡 A API pode exigir autenticação para alguns endpoints')
    }
    
    console.log('💡 Verifique se o serviço está online em: https://oci-ko34.onrender.com/')
  }
}

verificarSolicitacoesProducao()