/**
 * Script para corrigir status_execucao no banco diretamente.
 * Resolve FK violation: execucoes_procedimentos_status_fkey
 *
 * Uso: npx ts-node scripts/corrigir-status-execucao-banco.ts
 * Ou: npx tsx scripts/corrigir-status-execucao-banco.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Corrigindo status_execucao no banco...')

  // 1. Inserir REALIZADO se não existir
  await prisma.$executeRawUnsafe(`
    INSERT INTO "status_execucao" ("codigo", "descricao")
    VALUES ('REALIZADO', 'Realizado')
    ON CONFLICT ("codigo") DO NOTHING
  `)
  console.log('✓ REALIZADO garantido em status_execucao')

  // 2. Atualizar execucoes_procedimentos: EXECUTADO -> REALIZADO
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO'
  `)
  console.log(`✓ ${result} execução(ões) atualizada(s) de EXECUTADO para REALIZADO`)

  // 3. Remover EXECUTADO de status_execucao
  await prisma.$executeRawUnsafe(`
    DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO'
  `)
  console.log('✓ EXECUTADO removido de status_execucao')

  // Verificar estado atual
  const statuses = await prisma.$queryRawUnsafe<{ codigo: string }[]>(
    `SELECT "codigo" FROM "status_execucao" ORDER BY "codigo"`
  )
  console.log('\nStatus atuais em status_execucao:', statuses.map((s) => s.codigo).join(', '))
  console.log('\nConcluído. A aplicação deve funcionar normalmente.')
}

main()
  .catch((e) => {
    console.error('Erro:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
