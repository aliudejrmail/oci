import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnosticarAlertasSolicitacoes() {
  console.log('🔍 Diagnóstico de Alertas - Solicitações Específicas\n')

  const protocolos = ['OCI-20260204-00005', 'OCI-20260203-00003']

  for (const protocolo of protocolos) {
    console.log('='.repeat(80))
    console.log(`📋 Analisando: ${protocolo}`)
    console.log('='.repeat(80))

    const solicitacao = await prisma.solicitacaoOci.findUnique({
      where: { numeroProtocolo: protocolo },
      include: {
        execucoes: {
          include: { procedimento: true }
        },
        alerta: true,
        paciente: true,
        oci: {
          include: { procedimentos: true }
        }
      }
    })

    if (!solicitacao) {
      console.log(`❌ Solicitação ${protocolo} não encontrada\n`)
      continue
    }

    // 1. Status geral
    console.log(`\n1️⃣  STATUS GERAL:`)
    console.log(`   Status: ${solicitacao.status}`)
    console.log(`   Data Prazo: ${solicitacao.dataPrazo.toLocaleDateString('pt-BR')}`)
    console.log(`   Data Conclusão: ${solicitacao.dataConclusao?.toLocaleDateString('pt-BR') || 'NÃO CONCLUÍDA'}`)
    console.log(`   Número APAC: ${solicitacao.numeroAutorizacaoApac || 'NÃO REGISTRADO'}`)
    console.log(`   Paciente: ${solicitacao.paciente.nome}`)
    console.log(`   OCI: ${solicitacao.oci.nome}`)

    // 2. Verificar alertas na tabela AlertaPrazo
    console.log(`\n2️⃣  ALERTAS NA TABELA AlertaPrazo:`)
    if (solicitacao.alerta) {
      console.log(`   ❌ ALERTA ATIVO ENCONTRADO:`)
      console.log(`      ID: ${solicitacao.alerta.id}`)
      console.log(`      Dias Restantes: ${solicitacao.alerta.diasRestantes}`)
      console.log(`      Nível: ${solicitacao.alerta.nivelAlerta}`)
      console.log(`      Notificado: ${solicitacao.alerta.notificado}`)
      console.log(`      Data Criação: ${solicitacao.alerta.createdAt.toLocaleString('pt-BR')}`)
    } else {
      console.log(`   ✅ Nenhum alerta ativo na tabela AlertaPrazo`)
    }

    // 3. Verificar execuções de procedimentos
    console.log(`\n3️⃣  EXECUÇÕES DE PROCEDIMENTOS:`)
    console.log(`   Total: ${solicitacao.execucoes.length}`)
    
    const statusCount: Record<string, number> = {}
    solicitacao.execucoes.forEach(exec => {
      statusCount[exec.status] = (statusCount[exec.status] || 0) + 1
    })

    console.log(`   Por status:`)
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`)
    })

    console.log(`\n   Detalhes das execuções:`)
    solicitacao.execucoes.forEach(exec => {
      const status = exec.status.padEnd(20)
      const procedimento = exec.procedimento.nome.substring(0, 50).padEnd(52)
      const dataExec = exec.dataExecucao ? exec.dataExecucao.toLocaleDateString('pt-BR') : 'Sem data'
      console.log(`      [${status}] ${procedimento} | ${dataExec}`)
    })

    // 4. Verificar se apareceria em dashboard
    console.log(`\n4️⃣  VERIFICAÇÃO DO DASHBOARD:`)
    
    // Query do dashboard de prazo de registro
    const apareceriaEmPrazoRegistro = await prisma.solicitacaoOci.findFirst({
      where: {
        id: solicitacao.id,
        status: { in: ['EM_ANDAMENTO'] },
        deletedAt: null
      }
    })

    if (apareceriaEmPrazoRegistro) {
      console.log(`   ⚠️  APARECERIA em "Próximas ao Prazo de Registro de Procedimentos"`)
      
      // Verificar se tem procedimentos executados sem data de execução
      const procSemData = solicitacao.execucoes.filter(
        e => e.status === 'REALIZADO' && !e.dataExecucao
      )
      
      if (procSemData.length > 0) {
        console.log(`   ❌ PROBLEMA: ${procSemData.length} procedimento(s) REALIZADO sem data de execução`)
        procSemData.forEach(p => {
          console.log(`      • ${p.procedimento.nome}`)
        })
      }
    } else {
      console.log(`   ✅ NÃO apareceria no dashboard de prazo de registro`)
    }

    // 5. Verificar query de alertas gerais
    const apareceriaEmAlertas = await prisma.alertaPrazo.findFirst({
      where: {
        solicitacaoId: solicitacao.id
      }
    })

    console.log(`\n5️⃣  ALERTAS GERAIS:`)
    if (apareceriaEmAlertas) {
      console.log(`   ❌ ALERTA ATIVO na tabela AlertaPrazo`)
    } else {
      console.log(`   ✅ Sem alertas na tabela AlertaPrazo`)
    }

    // 6. Diagnóstico e recomendações
    console.log(`\n6️⃣  DIAGNÓSTICO:`)
    
    const problemas = []
    
    if (solicitacao.alerta) {
      problemas.push('Alerta ativo na tabela AlertaPrazo (deveria ter sido removido)')
    }
    
    if (solicitacao.status === 'EM_ANDAMENTO' && solicitacao.execucoes.every(e => e.status === 'REALIZADO')) {
      problemas.push('Status EM_ANDAMENTO mas todos procedimentos REALIZADO')
    }
    
    const procSemData = solicitacao.execucoes.filter(
      e => e.status === 'REALIZADO' && !e.dataExecucao
    )
    if (procSemData.length > 0) {
      problemas.push(`${procSemData.length} procedimento(s) REALIZADO sem data de execução`)
    }

    if (problemas.length > 0) {
      console.log(`   ❌ PROBLEMAS ENCONTRADOS:`)
      problemas.forEach((p, i) => console.log(`      ${i + 1}. ${p}`))
      
      console.log(`\n   💡 SOLUÇÕES:`)
      if (solicitacao.alerta) {
        console.log(`      • Remover alerta órfão da tabela AlertaPrazo`)
      }
      if (procSemData.length > 0) {
        console.log(`      • Adicionar data de execução aos procedimentos REALIZADO`)
      }
    } else {
      console.log(`   ✅ Nenhum problema detectado`)
    }

    console.log('\n')
  }

  await prisma.$disconnect()
}

diagnosticarAlertasSolicitacoes()
  .catch(console.error)
  .finally(() => process.exit(0))