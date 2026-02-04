/**
 * Analisa uma solicitação específica independente do status
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

async function analisarSolicitacaoEspecifica(numeroProtocolo: string) {
  console.log(`🔍 Analisando solicitação: ${numeroProtocolo}`)
  console.log('')

  const solicitacao = await prisma.solicitacaoOci.findUnique({
    where: {
      numeroProtocolo: numeroProtocolo
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
      },
      alerta: true
    }
  })

  if (!solicitacao) {
    console.log('❌ Solicitação não encontrada!')
    return
  }

  console.log('═'.repeat(80))
  console.log(`📋 SOLICITAÇÃO: ${solicitacao.numeroProtocolo}`)
  console.log(`   Paciente: ${solicitacao.paciente?.nome}`)
  console.log(`   OCI: ${solicitacao.oci.nome} (${solicitacao.oci.tipo})`)
  console.log(`   Status: ${solicitacao.status}`)
  console.log(`   Data Solicitação: ${solicitacao.dataSolicitacao?.toLocaleString('pt-BR')}`)
  console.log(`   Data Conclusão: ${solicitacao.dataConclusao?.toLocaleString('pt-BR') || 'N/A'}`)
  console.log(`   Data Prazo: ${solicitacao.dataPrazo?.toLocaleString('pt-BR')}`)
  console.log('')

  // Informações APAC
  console.log(`📊 INFORMAÇÕES APAC:`)
  console.log(`   Data Início Validade: ${solicitacao.dataInicioValidadeApac?.toLocaleString('pt-BR') || 'N/A'}`)
  console.log(`   Data Encerramento: ${solicitacao.dataEncerramentoApac?.toLocaleString('pt-BR') || 'N/A'}`)
  console.log(`   Competência Início: ${solicitacao.competenciaInicioApac || 'N/A'}`)
  console.log(`   Competência Fim: ${solicitacao.competenciaFimApac || 'N/A'}`)
  console.log(`   Número Autorização: ${solicitacao.numeroAutorizacaoApac || 'N/A'}`)
  console.log('')

  // Calcular prazos se houver competência
  if (solicitacao.competenciaFimApac && solicitacao.dataInicioValidadeApac) {
    const tipoOci = solicitacao.oci.tipo as 'GERAL' | 'ONCOLOGICO'
    const dataLimite = (tipoOci === 'ONCOLOGICO' && solicitacao.dataInicioValidadeApac)
      ? dataLimiteRegistroOncologico(solicitacao.dataInicioValidadeApac, solicitacao.competenciaFimApac)
      : dataFimCompetencia(solicitacao.competenciaFimApac)
    
    const diasRestantes = calcularDiasRestantes(dataLimite)
    const nivelAlerta = determinarNivelAlerta(diasRestantes, tipoOci)

    console.log(`📅 CÁLCULO DE PRAZOS:`)
    console.log(`   Data limite registro: ${dataLimite.toLocaleDateString('pt-BR')}`)
    console.log(`   Dias restantes: ${diasRestantes} (${nivelAlerta})`)
    console.log('')
  }

  // Alerta no banco
  if (solicitacao.alerta) {
    console.log(`🚨 ALERTA NO BANCO:`)
    console.log(`   Dias restantes: ${solicitacao.alerta.diasRestantes}`)
    console.log(`   Nível: ${solicitacao.alerta.nivelAlerta}`)
    console.log(`   Notificado: ${solicitacao.alerta.notificado}`)
    console.log(`   Data notificação: ${solicitacao.alerta.dataNotificacao?.toLocaleString('pt-BR') || 'N/A'}`)
    console.log(`   Criado em: ${solicitacao.alerta.createdAt?.toLocaleString('pt-BR')}`)
    console.log(`   Atualizado em: ${solicitacao.alerta.updatedAt?.toLocaleString('pt-BR')}`)
    console.log('')
  } else {
    console.log(`✅ Não há alerta registrado no banco para esta solicitação`)
    console.log('')
  }

  // Analisar procedimentos
  const obrigatorios = solicitacao.oci.procedimentos.filter(p => p.obrigatorio)
  const execucoesRealizadas = solicitacao.execucoes.filter(e => e.status === STATUS_EXECUCAO.REALIZADO)
  const execucoesPendentes = solicitacao.execucoes.filter(e => e.status !== STATUS_EXECUCAO.REALIZADO)

  console.log(`🔧 PROCEDIMENTOS:`)
  console.log(`   Total na OCI: ${solicitacao.oci.procedimentos.length}`)
  console.log(`   Obrigatórios: ${obrigatorios.length}`)
  console.log(`   Execuções realizadas: ${execucoesRealizadas.length}`)
  console.log(`   Execuções pendentes: ${execucoesPendentes.length}`)
  console.log('')

  console.log(`📋 DETALHES DAS EXECUÇÕES:`)
  for (const exec of solicitacao.execucoes) {
    const isObrigatorio = exec.procedimento.obrigatorio ? '🔴' : '🔵'
    const dataExec = exec.dataExecucao ? exec.dataExecucao.toLocaleDateString('pt-BR') : '-'
    const dataAgend = exec.dataAgendamento ? exec.dataAgendamento.toLocaleDateString('pt-BR') : '-'
    
    console.log(`   ${isObrigatorio} ${exec.procedimento.nome}`)
    console.log(`     Status: ${exec.status} | Execução: ${dataExec} | Agendamento: ${dataAgend}`)
    
    if (exec.dataColetaMaterialBiopsia || exec.dataRegistroResultadoBiopsia) {
      console.log(`     Coleta: ${exec.dataColetaMaterialBiopsia?.toLocaleDateString('pt-BR') || '-'} | Resultado: ${exec.dataRegistroResultadoBiopsia?.toLocaleDateString('pt-BR') || '-'}`)
    }
  }
  console.log('')

  // DIAGNÓSTICO DO PROBLEMA
  console.log(`🔍 DIAGNÓSTICO:`)
  
  if (solicitacao.status === StatusSolicitacao.CONCLUIDA && solicitacao.alerta) {
    console.log(`❌ PROBLEMA IDENTIFICADO:`)
    console.log(`   → Solicitação está CONCLUÍDA mas ainda tem ALERTA ativo no banco`)
    console.log(`   → Isso não deveria acontecer - alertas devem ser removidos na conclusão`)
    console.log('')
    console.log(`💡 POSSÍVEIS CAUSAS:`)
    console.log(`   1. Alerta não foi removido quando a solicitação foi concluída`)
    console.log(`   2. Solicitação foi marcada como concluída sem atualizar alertas`)
    console.log(`   3. Bug na lógica de limpeza de alertas`)
    console.log('')
    console.log(`🛠️ SOLUÇÃO SUGERIDA:`)
    console.log(`   → Remover o alerta do banco para esta solicitação concluída`)
  } else if (solicitacao.status === StatusSolicitacao.CONCLUIDA && !solicitacao.alerta) {
    console.log(`✅ SITUAÇÃO CORRETA:`)
    console.log(`   → Solicitação concluída sem alertas ativos`)
  } else if (solicitacao.status !== StatusSolicitacao.CONCLUIDA && solicitacao.alerta) {
    console.log(`✅ SITUAÇÃO NORMAL:`)
    console.log(`   → Solicitação em andamento com alerta ativo`)
  }
}

async function main() {
  const numeroProtocolo = process.argv[2]
  
  if (!numeroProtocolo) {
    console.log('❌ Informe o número do protocolo como argumento')
    console.log('Uso: npx ts-node scripts/analisar-solicitacao-especifica.ts OCI-20260204-00005')
    return
  }
  
  try {
    await analisarSolicitacaoEspecifica(numeroProtocolo)
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()