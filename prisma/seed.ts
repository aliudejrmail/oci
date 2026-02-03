import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Migrar perfis DIRCA para AUTORIZADOR (compatibilidade)
  await prisma.usuario.updateMany({ where: { tipo: 'DIRCA' }, data: { tipo: 'AUTORIZADOR' } }).then((r) => {
    if (r.count > 0) console.log(`✅ ${r.count} usuário(s) DIRCA atualizado(s) para AUTORIZADOR`)
  })

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

  // OCIs: utilizar apenas as da tabela SIGTAP. Não criar OCIs com código próprio no seed.
  // Após o seed, execute: npm run importar:ocis-sigtap
  // (OCIs 090101, 090201, 090301, 090401, 090501, 090601 com procedimentos codigoSigtap)

  // Criar paciente de exemplo
  const paciente = await prisma.paciente.upsert({
    where: { cpf: '12345678900' },
    update: {},
    create: {
      nome: 'João Silva',
      cpf: '12345678900',
      dataNascimento: new Date('1980-05-15'),
      sexo: 'M',
      telefone: '(11) 98765-4321',
      email: 'joao.silva@email.com',
      municipio: 'São Paulo',
      uf: 'SP'
    }
  })
  console.log('✅ Paciente criado:', paciente.nome)

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
