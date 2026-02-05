import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, tipo: true, ativo: true }
  });
  console.log('Usuarios:', usuarios);
}

main().finally(() => prisma.$disconnect());
