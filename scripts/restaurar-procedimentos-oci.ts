/**
 * Restaura os procedimentos secundários (ProcedimentoOci) de acordo com cada
 * Oferta de Cuidado Integrado (OCI) definida no sistema.
 *
 * Garante que cada OCI tenha seus procedimentos corretamente associados,
 * criando os que estiverem faltando sem remover os existentes.
 *
 * Uso:
 *   npx ts-node scripts/restaurar-procedimentos-oci.ts
 *   npm run restaurar:procedimentos-oci
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TipoProcedimento = 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO_CIRURGICO' | 'TECNOLOGIA' | 'OUTRO'

interface ProcedimentoDef {
  codigo: string
  nome: string
  tipo: TipoProcedimento
  ordem: number
  obrigatorio: boolean
  codigoSigtap?: string
  descricao?: string
}

interface OciDef {
  codigo: string
  procedimentos: ProcedimentoDef[]
}

/** Mapeamento OCI -> procedimentos (alinhado ao seed.ts) */
const OCIS_COM_PROCEDIMENTOS: OciDef[] = [
  {
    codigo: 'OCI-CARDIO-001',
    procedimentos: [
      { codigo: 'PROC-001', nome: 'Consulta Cardiológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-002', nome: 'Eletrocardiograma', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-003', nome: 'Ecocardiograma', tipo: 'EXAME', ordem: 3, obrigatorio: true },
      { codigo: 'PROC-004', nome: 'Teste Ergométrico', tipo: 'EXAME', ordem: 4, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-ONCO-001',
    procedimentos: [
      { codigo: 'PROC-101', nome: 'Consulta Oncológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-102', nome: 'Exames Laboratoriais', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-103', nome: 'Tomografia Computadorizada', tipo: 'EXAME', ordem: 3, obrigatorio: true }
    ]
  },
  {
    codigo: 'OCI-DIAB-001',
    procedimentos: [
      { codigo: 'PROC-201', nome: 'Consulta em Diabetes', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-202', nome: 'Glicemia em jejum', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-203', nome: 'Hemoglobina glicada', tipo: 'EXAME', ordem: 3, obrigatorio: true },
      { codigo: 'PROC-204', nome: 'Fundoscopia', tipo: 'EXAME', ordem: 4, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-HIPER-001',
    procedimentos: [
      { codigo: 'PROC-301', nome: 'Consulta em Hipertensão', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-302', nome: 'Eletrocardiograma', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-303', nome: 'Creatinina e potássio', tipo: 'EXAME', ordem: 3, obrigatorio: true }
    ]
  },
  {
    codigo: 'OCI-MULHER-001',
    procedimentos: [
      { codigo: 'PROC-401', nome: 'Consulta Ginecológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-402', nome: 'Preventivo (citologia)', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-403', nome: 'Mamografia bilateral', tipo: 'EXAME', ordem: 3, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-MENTAL-001',
    procedimentos: [
      { codigo: 'PROC-501', nome: 'Consulta em Saúde Mental', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-502', nome: 'Acompanhamento psicológico', tipo: 'CONSULTA', ordem: 2, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-PNEUMO-001',
    procedimentos: [
      { codigo: 'PROC-601', nome: 'Consulta Pneumológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-602', nome: 'Espirometria', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-603', nome: 'Raio-X de tórax', tipo: 'EXAME', ordem: 3, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-ORTO-001',
    procedimentos: [
      { codigo: 'PROC-701', nome: 'Consulta Ortopédica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-702', nome: 'Raio-X', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-703', nome: 'Ressonância / Tomografia (conforme indicação)', tipo: 'EXAME', ordem: 3, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-OTORRINO-001',
    procedimentos: [
      { codigo: 'PROC-801', nome: 'Consulta Otorrinolaringológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-802', nome: 'Avaliação auditiva', tipo: 'EXAME', ordem: 2, obrigatorio: false },
      { codigo: 'PROC-803', nome: 'Avaliação de nasofaringe/orofaringe', tipo: 'EXAME', ordem: 3, obrigatorio: false }
    ]
  },
  {
    codigo: 'OCI-OFTALMO-001',
    procedimentos: [
      { codigo: 'PROC-901', nome: 'Consulta Oftalmológica', tipo: 'CONSULTA', ordem: 1, obrigatorio: true },
      { codigo: 'PROC-902', nome: 'Avaliação de acuidade visual e fundo de olho', tipo: 'EXAME', ordem: 2, obrigatorio: true },
      { codigo: 'PROC-903', nome: 'Exames sob sedação (quando indicado)', tipo: 'EXAME', ordem: 3, obrigatorio: false }
    ]
  }
]

async function main() {
  console.log('🔄 Restaurando procedimentos por OCI...\n')

  let totalCriados = 0
  let totalOcisProcessadas = 0
  let totalOcisNaoEncontradas = 0

  for (const ociDef of OCIS_COM_PROCEDIMENTOS) {
    const oci = await prisma.oci.findUnique({
      where: { codigo: ociDef.codigo },
      include: { procedimentos: true }
    })

    if (!oci) {
      console.log(`⚠️  OCI não encontrada: ${ociDef.codigo} - execute o seed primeiro`)
      totalOcisNaoEncontradas++
      continue
    }

    totalOcisProcessadas++
    const codigosExistentes = new Set(oci.procedimentos.map((p) => p.codigo))
    let criadosNestaOci = 0

    for (const proc of ociDef.procedimentos) {
      if (codigosExistentes.has(proc.codigo)) continue

      await prisma.procedimentoOci.create({
        data: {
          ociId: oci.id,
          codigo: proc.codigo,
          nome: proc.nome,
          tipo: proc.tipo,
          ordem: proc.ordem,
          obrigatorio: proc.obrigatorio,
          codigoSigtap: proc.codigoSigtap ?? null,
          descricao: proc.descricao ?? null
        }
      })
      criadosNestaOci++
      totalCriados++
      console.log(`   + ${ociDef.codigo}: ${proc.codigo} - ${proc.nome}`)
    }

    if (criadosNestaOci === 0 && oci.procedimentos.length === ociDef.procedimentos.length) {
      console.log(`   ✓ ${ociDef.codigo}: procedimentos já completos`)
    } else if (criadosNestaOci > 0) {
      console.log(`   ✓ ${ociDef.codigo}: ${criadosNestaOci} procedimento(s) criado(s)`)
    }
  }

  console.log('\n--- Resumo ---')
  console.log(`OCIs processadas: ${totalOcisProcessadas}`)
  console.log(`OCIs não encontradas: ${totalOcisNaoEncontradas}`)
  console.log(`Procedimentos criados: ${totalCriados}`)
  console.log('🎉 Restauração concluída.')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
