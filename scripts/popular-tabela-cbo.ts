import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cbos = [
  { codigo: "225103", descricao: "MEDICO INFECTOLOGISTA" },
  { codigo: "225109", descricao: "MEDICO NEFROLOGISTA" },
  { codigo: "225112", descricao: "MEDICO NEUROLOGISTA" },
  { codigo: "225115", descricao: "MEDICO ANGIOLOGISTA" },
  { codigo: "225120", descricao: "MEDICO CARDIOLOGISTA" },
  { codigo: "225124", descricao: "MEDICO PEDIATRA" },
  { codigo: "225125", descricao: "MEDICO CLINICO" },
  { codigo: "225127", descricao: "MEDICO PNEUMOLOGISTA" },
  { codigo: "225135", descricao: "MEDICO DERMATOLOGISTA" },
  { codigo: "225138", descricao: "MEDICO REUMATOLOGISTA" },
  { codigo: "225155", descricao: "MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" },
  { codigo: "225165", descricao: "MEDICO GASTROENTEROLOGISTA" },
  { codigo: "225203", descricao: "MEDICO EM CIRURGIA VASCULAR" },
  { codigo: "225225", descricao: "MEDICO CIRURGIAO GERAL" },
  { codigo: "225230", descricao: "MEDICO CIRURGIAO PEDIATRICO" },
  { codigo: "225250", descricao: "MEDICO GINECOLOGISTA E OBSTETRA" },
  { codigo: "225255", descricao: "MEDICO MASTOLOGISTA" },
  { codigo: "225270", descricao: "MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { codigo: "225275", descricao: "MEDICO OTORRINOLARINGOLOGISTA" },
  { codigo: "225280", descricao: "MEDICO COLOPROCTOLOGISTA" },
  { codigo: "225285", descricao: "MEDICO UROLOGISTA" },
  { codigo: "225320", descricao: "MEDICO EM RADIOLOGIA E DIAGNOSTICO POR IMAGEM" }
];

async function popularCbos() {
  console.log('🔄 Iniciando população da tabela CBOs...\n');

  let criados = 0;
  let jaExistiam = 0;

  for (const cboData of cbos) {
    try {
      const existente = await prisma.cbo.findUnique({
        where: { codigo: cboData.codigo }
      });

      if (existente) {
        console.log(`✅ CBO já existe: ${cboData.codigo} - ${cboData.descricao}`);
        jaExistiam++;
      } else {
        await prisma.cbo.create({
          data: cboData
        });
        console.log(`✅ CBO criado: ${cboData.codigo} - ${cboData.descricao}`);
        criados++;
      }
    } catch (error: any) {
      console.log(`❌ Erro ao processar CBO ${cboData.codigo}: ${error.message}`);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`   ✅ Criados: ${criados}`);
  console.log(`   🔄 Já existiam: ${jaExistiam}`);
  console.log(`   📋 Total: ${cbos.length}`);

  // Atualizar profissionais existentes para vincular com a tabela CBO
  console.log('\n🔄 Vinculando profissionais existentes aos CBOs...\n');

  const profissionais = await prisma.profissional.findMany({
    where: {
      cbo: { not: null }
    }
  });

  let vinculados = 0;
  let naoEncontrados = 0;

  for (const prof of profissionais) {
    if (!prof.cbo) continue;

    // Limpar o código CBO (remover hífens e espaços, pegar apenas os 6 dígitos)
    const codigoLimpo = prof.cbo.replace(/\D/g, '').substring(0, 6);

    const cbo = await prisma.cbo.findUnique({
      where: { codigo: codigoLimpo }
    });

    if (cbo) {
      await prisma.profissional.update({
        where: { id: prof.id },
        data: { cboId: cbo.id }
      });
      console.log(`✅ Profissional ${prof.nome} vinculado ao CBO ${codigoLimpo}`);
      vinculados++;
    } else {
      console.log(`⚠️  CBO ${codigoLimpo} não encontrado para profissional ${prof.nome}`);
      naoEncontrados++;
    }
  }

  console.log('\n📊 Resumo de Vinculação:');
  console.log(`   ✅ Vinculados: ${vinculados}`);
  console.log(`   ⚠️  Não encontrados: ${naoEncontrados}`);
}

popularCbos()
  .then(() => {
    console.log('\n✅ População concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
