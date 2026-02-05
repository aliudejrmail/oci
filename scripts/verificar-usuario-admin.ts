import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const u = await prisma.usuario.findUnique({ where: { email: 'admin@oci.com' } });
  console.log(u);
}

main().finally(() => prisma.$disconnect());
