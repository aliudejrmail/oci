import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.profissional.count()
  const ativos = await prisma.profissional.count({ where: { ativo: true } })
  const inativos = await prisma.profissional.count({ where: { ativo: false } })

  console.log(`Total de profissionais no banco: ${total}`)
  console.log(`Ativos: ${ativos}`)
  console.log(`Inativos: ${inativos}`)
}

main()
  .catch((err) => {
    console.error('Erro ao contar profissionais:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
