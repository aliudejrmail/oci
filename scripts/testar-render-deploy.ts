// Testa se o deploy no Render está atualizado
async function testarRenderDeploy() {
  const baseURL = 'https://oci-ko34.onrender.com'
  
  console.log('🔍 Testando deploy no Render...\n')
  
  try {
    // 1. Testar se o servidor está respondendo
    console.log('1. Testando se servidor está online...')
    const response1 = await fetch(`${baseURL}/api/dashboard/estatisticas?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`)
    }
    
    console.log('✅ Servidor online')
    
    // 2. Testar endpoint de alertas
    console.log('\n2. Testando alertas...')
    const response2 = await fetch(`${baseURL}/api/dashboard/alertas?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const alertas = await response2.json() as any[]
    console.log('✅ Endpoint de alertas respondendo')
    console.log(`📊 ${alertas.length} alerta(s) encontrado(s)`)
    
    // 3. Testar endpoint de prazo de registro
    console.log('\n3. Testando alertas de prazo de registro...')
    const response3 = await fetch(`${baseURL}/api/dashboard/proximas-prazo-registro-procedimentos?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const prazoAlertas = await response3.json() as any[]
    console.log('✅ Endpoint de prazo de registro respondendo')
    console.log(`📊 ${prazoAlertas.length} alerta(s) de prazo encontrado(s)`)
    
    // 4. Verificar se OCI-20260204-00005 aparece em algum lugar
    console.log('\n4. Verificando se OCI-20260204-00005 aparece em alertas...')
    const protocolo = 'OCI-20260204-00005'
    let encontradoEm = []
    
    if (alertas.some((a: any) => a.solicitacao?.numeroProtocolo === protocolo)) {
      encontradoEm.push('alertas gerais')
    }
    
    if (prazoAlertas.some((a: any) => a.numeroProtocolo === protocolo)) {
      encontradoEm.push('alertas de prazo')
    }
    
    if (encontradoEm.length > 0) {
      console.log(`❌ Protocolo ${protocolo} ainda aparece em: ${encontradoEm.join(', ')}`)
    } else {
      console.log(`✅ Protocolo ${protocolo} NÃO aparece em nenhum alerta`)
    }
    
    // 5. Verificar timestamp do deploy
    console.log('\n5. Informações do servidor...')
    console.log(`🕐 Timestamp da consulta: ${new Date().toLocaleString('pt-BR')}`)
    console.log(`🌐 URL base: ${baseURL}`)
    
    console.log('\n✅ Teste completo! Aguarde alguns minutos e recarregue a página com Ctrl+F5')
    
  } catch (error: any) {
    console.error('\n❌ Erro ao testar Render:')
    console.error(`🔥 Erro: ${error.message}`)
    console.log('\n💡 Aguarde alguns minutos e tente novamente')
  }
}

testarRenderDeploy()