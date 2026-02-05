import { PrismaClient, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // 1. Criar usuário admin
  console.log('👤 Criando usuário admin...');
  const senhaHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@oci.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@oci.com',
      senha: senhaHash,
      tipo: TipoUsuario.ADMIN,
      ativo: true
    }
  });
  console.log('✅ Usuário admin criado');
  console.log('   📧 Email: admin@oci.com');
  console.log('   🔑 Senha: admin123\n');

  // 2. Criar usuários de teste
  console.log('👥 Criando usuários de teste...');
  await prisma.usuario.upsert({
    where: { email: 'gestor@oci.com' },
    update: {},
    create: {
      nome: 'Gestor Teste',
      email: 'gestor@oci.com',
      senha: await bcrypt.hash('gestor123', 10),
      tipo: TipoUsuario.GESTOR,
      ativo: true
    }
  });

  await prisma.usuario.upsert({
    where: { email: 'atendente@oci.com' },
    update: {},
    create: {
      nome: 'Atendente Teste',
      email: 'atendente@oci.com',
      senha: await bcrypt.hash('atendente123', 10),
      tipo: TipoUsuario.ATENDENTE,
      ativo: true
    }
  });
  console.log('✅ Usuários de teste criados\n');

  // 3. Criar Unidades de Saúde
  console.log('🏢 Criando unidades de saúde...');
  const unidade1 = await prisma.unidadeSaude.upsert({
    where: { cnes: '0000000' },
    update: {},
    create: {
      cnes: '0000000',
      nome: 'UBS Central',
      ativo: true,
      executante: 1,
      solicitante: 1
    }
  });

  await prisma.unidadeSaude.upsert({
    where: { cnes: '0000001' },
    update: {},
    create: {
      cnes: '0000001',
      nome: 'Hospital Regional',
      ativo: true,
      executante: 1,
      solicitante: 1
    }
  });
  console.log('✅ Unidades criadas\n');

  // 4. Criar OCIs básicas
  console.log('📋 Criando OCIs...');
  
  await prisma.oci.upsert({
    where: { codigo: 'OCI-GERAL-001' },
    update: {},
    create: {
      codigo: 'OCI-GERAL-001',
      nome: 'Biópsia de Colo Uterino',
      descricao: 'OCI para biópsia de colo uterino com procedimentos obrigatórios',
      tipo: 'GERAL',
      prazoMaximoDias: 60,
      ativo: true
    }
  });

  await prisma.oci.upsert({
    where: { codigo: 'OCI-ONCO-001' },
    update: {},
    create: {
      codigo: 'OCI-ONCO-001',
      nome: 'Excisão Tipo I de Colo Uterino',
      descricao: 'OCI oncológica para excisão de colo uterino',
      tipo: 'ONCOLOGICO',
      prazoMaximoDias: 30,
      ativo: true
    }
  });

  console.log(`✅ OCIs criadas\n`);

  // 5. Vincular admin às unidades
  console.log('🔗 Vinculando usuário admin às unidades...');
  await prisma.usuario.update({
    where: { id: admin.id },
    data: { unidadeId: unidade1.id }
  });
  console.log('✅ Vínculos criados\n');

  console.log('✅ Seed concluído com sucesso!');
  console.log('\n📝 Dados criados:');
  console.log('   👤 3 usuários (admin, gestor, atendente)');
  console.log('   🏢 2 unidades de saúde');
  console.log('   📋 2 OCIs (1 geral, 1 oncológica)');
  console.log('\n🔑 Credenciais de acesso:');
  console.log('   Admin: admin@oci.com / admin123');
  console.log('   Gestor: gestor@oci.com / gestor123');
  console.log('   Atendente: atendente@oci.com / atendente123');
}

seed()
  .then(() => {
    console.log('\n🎉 Banco de dados restaurado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao popular banco:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
