import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

/** Importa OCIs do JSON (34 OCIs oficiais SIGTAP: 0901010014, 0902010018, etc.) */
async function importarOcisDoJson() {
  const jsonPath = path.resolve(process.cwd(), 'data/ocis-com-procedimentos.json')
  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️ Arquivo data/ocis-com-procedimentos.json não encontrado. OCIs não importadas.')
    return
  }
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  const ocis = JSON.parse(raw) as Array<{
    codigo: string
    nome: string
    descricao?: string
    tipo: 'GERAL' | 'ONCOLOGICO'
    prazoMaximoDias: number
    procedimentos: Array<{ codigoSigtap: string; ordem?: number; obrigatorio?: boolean; nome?: string }>
  }>
  let count = 0
  for (const o of ocis) {
    const oci = await prisma.oci.upsert({
      where: { codigo: o.codigo },
      update: { nome: o.nome, descricao: o.descricao ?? null, tipo: o.tipo, prazoMaximoDias: o.prazoMaximoDias },
      create: {
        codigo: o.codigo,
        nome: o.nome,
        descricao: o.descricao ?? null,
        tipo: o.tipo,
        prazoMaximoDias: o.prazoMaximoDias
      }
    })
    let ordem = 1
    for (const p of o.procedimentos) {
      const codigoSigtap = String(p.codigoSigtap).trim()
      if (!codigoSigtap) continue
      let nome = p.nome?.trim()
      if (!nome) {
        const sigtap = await prisma.procedimentoSigtap.findUnique({ where: { codigo: codigoSigtap } })
        nome = sigtap?.nome ?? codigoSigtap
      }
      const existente = await prisma.procedimentoOci.findFirst({
        where: { ociId: oci.id, codigo: codigoSigtap }
      })
      const tipo = nome.toUpperCase().includes('CONSULTA') ? 'CONSULTA' : 'EXAME'
      const obrigatorio = p.obrigatorio ?? true
      const ordemProc = p.ordem ?? ordem
      if (existente) {
        await prisma.procedimentoOci.update({
          where: { id: existente.id },
          data: { codigoSigtap, nome, tipo, ordem: ordemProc, obrigatorio }
        })
      } else {
        await prisma.procedimentoOci.create({
          data: {
            ociId: oci.id,
            codigo: codigoSigtap,
            codigoSigtap,
            nome,
            tipo,
            ordem: ordemProc,
            obrigatorio
          }
        })
      }
      count++
      ordem++
    }
  }
  console.log(`✅ OCIs importadas: ${ocis.length} OCIs, ${count} procedimentos`)
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Migrar perfis DIRCA para AUTORIZADOR (compatibilidade)
  // Observação: o enum TipoUsuario atual não inclui mais 'DIRCA',
  // então este trecho foi desativado para evitar erro de tipo no ts-node.
  // Caso ainda existam usuários com este tipo em bancos legados,
  // faça a migração via script SQL direto.
  // await prisma.usuario.updateMany({ where: { tipo: 'DIRCA' as any }, data: { tipo: 'AUTORIZADOR' } }).then((r) => {
  //   if (r.count > 0) console.log(`✅ ${r.count} usuário(s) DIRCA atualizado(s) para AUTORIZADOR`)
  // })

  // Criar usuário admin
  const senhaHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@oci.sus' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@oci.sus',
      senha: senhaHash,
      tipo: 'ADMIN'
    }
  })
  console.log('✅ Usuário admin criado:', admin.email)

  // Usuário Autorizador (registro de APAC e cadastro de profissionais autorizadores)
  const senhaAutorizador = await bcrypt.hash('autorizador123', 10)
  const autorizador = await prisma.usuario.upsert({
    where: { email: 'autorizador@oci.sus' },
    update: {},
    create: {
      nome: 'Usuário Autorizador',
      email: 'autorizador@oci.sus',
      senha: senhaAutorizador,
      tipo: 'AUTORIZADOR'
    }
  })
  console.log('✅ Usuário Autorizador criado:', autorizador.email)

  // Usuário Solicitante (criação e acompanhamento de solicitações OCI)
  const senhaSolicitante = await bcrypt.hash('solicitante123', 10)
  const solicitante = await prisma.usuario.upsert({
    where: { email: 'solicitante@oci.sus' },
    update: {},
    create: {
      nome: 'Usuário Solicitante',
      email: 'solicitante@oci.sus',
      senha: senhaSolicitante,
      tipo: 'SOLICITANTE'
    }
  })
  console.log('✅ Usuário Solicitante criado:', solicitante.email)

  // Usuário Executante (registro de procedimentos nas solicitações)
  const senhaExecutante = await bcrypt.hash('executante123', 10)
  const executante = await prisma.usuario.upsert({
    where: { email: 'executante@oci.sus' },
    update: {},
    create: {
      nome: 'Usuário Executante',
      email: 'executante@oci.sus',
      senha: senhaExecutante,
      tipo: 'EXECUTANTE'
    }
  })
  console.log('✅ Usuário Executante criado:', executante.email)

  // Unidades de Saúde (CNES)
  const unidadesSaude = [
    { cnes: '735914', nome: 'UBS ADRIANO WALTER DE OLIVEIRA COELHO' },
    { cnes: '2614308', nome: 'UNIDADE BASICA DE SAUDE GUANABARA' },
    { cnes: '5408032', nome: 'UNIDADE BASICA DE SAUDE CASAS POPULARES' },
    { cnes: '9053824', nome: 'UNIDADE MOVEL DE SUPORTE AVANCADO SAMU PARAUAPEBAS OTS6163' },
    { cnes: '921629', nome: 'UNIDADE BASICA DE SAUDE ALBANY' },
    { cnes: '3860035', nome: 'CENTRO ESPECIALIZADO EM REABILITACAO DE PARAUAPEBAS' },
    { cnes: '7975341', nome: 'UNIDADE BASICA DE SAUDE MINERIOS' },
    { cnes: '3717917', nome: 'CENTRO DE TESTAGEM E ACONSELHAMENTO CTA' },
    { cnes: '7560109', nome: 'BASE DESCENTRALIZADA DO SAMU PARAUAPEBAS' },
    { cnes: '2614375', nome: 'UNIDADE BASICA DE SAUDE APA' },
    { cnes: '7197632', nome: 'LABORATORIO MUNICIPAL DE PARAUAPEBAS' },
    { cnes: '7371586', nome: 'POLICLINICA MUNICIPAL DE PARAUAPEBAS' },
    { cnes: '2614324', nome: 'UNIDADE BASICA DE SAUDE LIBERDADE I' },
    { cnes: '6260632', nome: 'SECRETARIA MUNICIPAL DE SAUDE SEMSA' },
    { cnes: '2614383', nome: 'UNIDADE BASICA DE SAUDE PAULO FONTELES' },
    { cnes: '64335', nome: 'UNIDADE BASICA DE SAUDE VS10' },
    { cnes: '9966250', nome: 'UNIDADE BASICA DE SAUDE GARIMPO DAS PEDRAS' },
    { cnes: '7818041', nome: 'UBS MARIA DE LOURDES DA PAZ GUALDINO DOS SANTOS' },
    { cnes: '137030', nome: 'UNIDADE MUNICIPAL DE SAUDE DO TRABALHADOR' },
    { cnes: '5021820', nome: 'CENTRO DE ATENCAO PSICOSSOCIAL CAPS II' },
    { cnes: '7163363', nome: 'UNIDADE BASICA DE SAUDE JARDIM CANADA' },
    { cnes: '6039073', nome: 'UNIDADE BASICA DE SAUDE CIDADE NOVA' },
    { cnes: '7067186', nome: 'UNIDADE BASICA DE SAUDE DA PAZ' },
    { cnes: '7067194', nome: 'UNIDADE BASICA DE SAUDE LIBERDADE II' },
    { cnes: '2615746', nome: 'HOSPITAL GERAL DE PARAUAPEBAS MANOEL EVALDO BENEVIDES ALVES' },
    { cnes: '2660393', nome: 'UNIDADE BASICA DE SAUDE CEDERE I' },
    { cnes: '2614294', nome: 'UNIDADE BASICA DE SAUDE DR BENTO TORRES PINTO' },
    { cnes: '2614332', nome: 'UNIDADE BASICA DE SAUDE PALMARES I' },
    { cnes: '2614340', nome: 'UNIDADE BASICA DE SAUDE JERONIMO DE FREITAS' },
    { cnes: '9693041', nome: 'VIGILANCIA EM SAUDE' },
    { cnes: '2846632', nome: 'UNIDADE MOVEL DE SAUDE DA MULHER' },
    { cnes: '7904894', nome: 'UPA SEBASTIAO BARBOSA DA SILVA' },
    { cnes: '9990682', nome: 'MELHOR EM CASA SERVICO DE ATENCAO DOMICILIAR SAD' },
    { cnes: '2673851', nome: 'UNIDADE BASICA DE SAUDE NOVO BRASIL' },
    { cnes: '7226799', nome: 'COMPLEXO REGULADOR MUNICIPAL' },
    { cnes: '2673843', nome: 'UNIDADE BASICA DE SAUDE ALTAMIRA' },
    { cnes: '2614359', nome: 'UNIDADE BASICA DE SAUDE RIO BRANCO' },
    { cnes: '2614316', nome: 'UNIDADE BASICA DE SAUDE FORTALEZA' },
    { cnes: '2614367', nome: 'UNIDADE BASICA DE SAUDE VILA SANCAO' },
    { cnes: '4463315', nome: 'CENTRAL DE IMUNIZACAO DE PARAUAPEBAS' },
    { cnes: '4487656', nome: 'UNIDADE DE VIGILANCIA EM SAUDE AMBIENTAL E ENDEMIAS' },
    { cnes: '4492803', nome: 'UNIDADE DE VIGILANCIA DE ZOONOSES UVZ' },
    { cnes: '4412281', nome: 'CENTRAL DE ABASTECIMENTO FARMACEUTICO CAF' },
    { cnes: '4641566', nome: 'UNIDADE BASICA DE SAUDE GRAZIELLY CAETANO DE OLIVEIRA' },
    { cnes: '8053650', nome: 'UNIDADE ODONTOLOGICA MOVEL 02' },
    { cnes: '8053383', nome: 'UNIDADE ODONTOLOGICA MOVEL 01' }
  ] as const

  const { count: unidadesCriadas } = await prisma.unidadeSaude.createMany({
    data: unidadesSaude.map((u) => ({ cnes: u.cnes, nome: u.nome, executante: 0, solicitante: 0 })),
    skipDuplicates: true
  })
  console.log(`✅ Unidades de Saúde inseridas: ${unidadesCriadas}`)

  // Marcar primeira unidade como executante (para agendamento de procedimentos)
  const primeira = await prisma.unidadeSaude.findFirst({ where: { cnes: unidadesSaude[0].cnes } })
  if (primeira) {
    await prisma.unidadeSaude.update({ where: { id: primeira.id }, data: { executante: 1 } })
    console.log('✅ Unidade executante de exemplo:', primeira.nome)
  }
  // Marcar segunda unidade como solicitante (para originar solicitações)
  const segunda = await prisma.unidadeSaude.findFirst({ where: { cnes: unidadesSaude[1].cnes } })
  if (segunda) {
    await prisma.unidadeSaude.update({ where: { id: segunda.id }, data: { solicitante: 1 } })
    console.log('✅ Unidade solicitante de exemplo:', segunda.nome)
  }

  // OCIs: importar do JSON (6 OCIs principais: Oncologia, Cardiologia, Ortopedia, etc.)
  await importarOcisDoJson()

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
