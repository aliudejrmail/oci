import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificar() {
  console.log('🔍 Verificando dados no banco...\n');
  
  const usuarios = await prisma.usuario.count();
  const pacientes = await prisma.paciente.count();
  const profissionais = await prisma.profissional.count();
  const unidades = await prisma.unidadeSaude.count();
  const ocis = await prisma.oci.count();
  const solicitacoes = await prisma.solicitacaoOci.count();
  
  console.log(`👥 Usuários: ${usuarios}`);
  console.log(`🏥 Pacientes: ${pacientes}`);
  console.log(`👨‍⚕️ Profissionais: ${profissionais}`);
  console.log(`🏢 Unidades: ${unidades}`);
  console.log(`📋 OCIs: ${ocis}`);
  console.log(`📄 Solicitações: ${solicitacoes}`);
}

verificar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
