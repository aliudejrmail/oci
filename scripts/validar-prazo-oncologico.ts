/**
 * Valida registros do banco relacionados ao prazo oncológico (30 dias desde a consulta).
 * Consulta solicitações com 1º procedimento registrado e exibe:
 * - Dados da solicitação e OCI (tipo, data do 1º proc., competências)
 * - Data limite calculada (oncológica: 30 dias desde consulta ou fim 2ª competência)
 * - Dias restantes até o prazo
 * - Execuções (procedimento, data, status)
 *
 * Uso: npx ts-node scripts/validar-prazo-oncologico.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import {
  dataLimiteRegistroOncologico,
  dataFimCompetencia,
  calcularDiasRestantes
} from '../src/utils/date.utils'

const prisma = new PrismaClient()

function formatarDataCurta(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function main() {
  console.log('=== Validação de prazos (OCI oncológica – 30 dias desde a consulta) ===\n')

  // Buscar solicitações que tenham data do 1º procedimento e competências (já em andamento com procedimento registrado)
  const solicitacoes = await prisma.solicitacaoOci.findMany({
    where: {
      dataInicioValidadeApac: { not: null },
      competenciaFimApac: { not: null }
    },
    include: {
      paciente: { select: { id: true, nome: true, cpf: true } },
      oci: { select: { id: true, codigo: true, nome: true, tipo: true, prazoMaximoDias: true } },
      execucoes: {
        include: { procedimento: { select: { nome: true, codigo: true, ordem: true } } },
        orderBy: { procedimento: { ordem: 'asc' } }
      },
      alerta: true
    },
    orderBy: { dataInicioValidadeApac: 'desc' }
  })

  if (solicitacoes.length === 0) {
    console.log('Nenhuma solicitação encontrada com data do 1º procedimento e competência fim APAC.')
    return
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  for (const sol of solicitacoes) {
    const dataConsulta = sol.dataInicioValidadeApac!
    const competenciaFim = sol.competenciaFimApac!
    const tipoOci = sol.oci.tipo

    // Data limite: oncológica = min(30 dias desde consulta, fim 2ª competência); geral = fim 2ª competência
    const dataLimite =
      tipoOci === 'ONCOLOGICO'
        ? dataLimiteRegistroOncologico(dataConsulta, competenciaFim)
        : dataFimCompetencia(competenciaFim)

    const diasRestantes = calcularDiasRestantes(dataLimite)

    console.log('---')
    console.log('Solicitação:', sol.numeroProtocolo)
    console.log('Paciente:', sol.paciente.nome, '| CPF:', sol.paciente.cpf)
    console.log('OCI:', sol.oci.nome)
    console.log('Código OCI:', sol.oci.codigo, '| Tipo:', tipoOci, '| Prazo máx. OCI:', sol.oci.prazoMaximoDias, 'dias')
    console.log('')
    console.log('Data do 1º procedimento (consulta):', formatarDataCurta(dataConsulta))
    console.log('1ª competência:', sol.competenciaInicioApac ?? '-')
    console.log('2ª competência (apresentação):', competenciaFim)
    console.log('')
    console.log('Data limite para registro de procedimentos:', formatarDataCurta(dataLimite))
    if (tipoOci === 'ONCOLOGICO') {
      const trintaDias = new Date(dataConsulta)
      trintaDias.setDate(trintaDias.getDate() + 30)
      const fimComp = dataFimCompetencia(competenciaFim)
      console.log(
        '  (oncológica: menor entre 30 dias desde consulta =',
        formatarDataCurta(trintaDias),
        'e fim 2ª competência =',
        formatarDataCurta(fimComp) + ')'
      )
    }
    console.log('Dias restantes até o prazo:', diasRestantes, diasRestantes === 1 ? 'dia' : 'dias')
    console.log('Alerta no banco (AlertaPrazo):', sol.alerta ? `diasRestantes=${sol.alerta.diasRestantes} nivel=${sol.alerta.nivelAlerta}` : 'não existe')
    console.log('')
    console.log('Execuções:')
    for (const exec of sol.execucoes) {
      const dataExec = exec.dataExecucao ? formatarDataCurta(exec.dataExecucao) : '-'
      console.log(
        `  - ${exec.procedimento.nome} | dataExecucao: ${dataExec} | status: ${exec.status}`
      )
    }
    console.log('')
  }

  // Validação específica: consulta 01/01/2026 → prazo esperado 31/01/2026
  const consulta0101 = new Date(2026, 0, 1, 12, 0, 0) // 01/01/2026
  const competenciaFev2026 = '202602'
  const limiteEsperado = dataLimiteRegistroOncologico(consulta0101, competenciaFev2026)
  const limiteEsperadoStr = formatarDataCurta(limiteEsperado)
  const ok = limiteEsperadoStr === '31/01/2026'

  console.log('=== Validação da regra (consulta 01/01/2026) ===')
  console.log('Data consulta: 01/01/2026')
  console.log('2ª competência: 202602 (fev/2026)')
  console.log('Data limite calculada:', limiteEsperadoStr)
  console.log('Esperado: 31/01/2026 →', ok ? 'OK' : 'ERRO')
  console.log('Dias restantes (a partir de hoje):', calcularDiasRestantes(limiteEsperado), 'dias')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
