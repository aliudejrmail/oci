import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const novoHash = '$2a$10$kxcdaGdFNIE2QjYZvx.RdeP/EeYnf4FmiJ0yjWVoeoUI9oPwshzsS'; // senha: admin123

  const updated = await prisma.usuario.update({
    where: { email: 'admin@oci.com' },
    data: { senha: novoHash }
  });

  console.log('Senha atualizada para usuario:', updated.email);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
