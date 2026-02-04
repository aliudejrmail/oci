/**
 * Script para limpar alertas órfãos de solicitações que já foram concluídas ou canceladas
 */
import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'

const prisma = new PrismaClient()

async function limparAlertasOrfaos() {
  console.log('🧹 Limpando alertas órfãos de solicitações concluídas/canceladas...\n')

  // Buscar alertas de solicitações concluídas ou canceladas
  const alertasOrfaos = await prisma.alertaPrazo.findMany({
    where: {
      solicitacao: {
        status: {
          in: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
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
      }
    }
  })

  console.log(`📊 Encontrados ${alertasOrfaos.length} alertas órfãos para limpeza`)
  console.log('')

  if (alertasOrfaos.length === 0) {
    console.log('✅ Não há alertas órfãos para limpar!')
    return 0
  }

  // Exibir detalhes dos alertas que serão removidos
  console.log('📋 ALERTAS QUE SERÃO REMOVIDOS:')
  console.log('─'.repeat(80))
  
  for (const alerta of alertasOrfaos) {
    console.log(`🗑️  ${alerta.solicitacao.numeroProtocolo} (${alerta.solicitacao.status})`)
    console.log(`   Dias restantes: ${alerta.diasRestantes} | Nível: ${alerta.nivelAlerta}`)
    if (alerta.solicitacao.dataConclusao) {
      console.log(`   Concluída em: ${alerta.solicitacao.dataConclusao.toLocaleString('pt-BR')}`)
    }
    console.log('')
  }

  // Remover os alertas órfãos
  const idsParaRemover = alertasOrfaos.map(a => a.id)
  
  const resultado = await prisma.alertaPrazo.deleteMany({
    where: {
      id: {
        in: idsParaRemover
      }
    }
  })

  console.log('─'.repeat(80))
  console.log(`✅ ${resultado.count} alerta(s) órfão(s) removido(s) com sucesso!`)
  
  return resultado.count
}

async function main() {
  try {
    await limparAlertasOrfaos()
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()