/**
 * Vincula usuários EXECUTANTE sem unidade à primeira unidade executante do banco.
 * Útil para corrigir dados de teste após validar com validar-agendamentos-executante.ts.
 *
 * Uso: npx ts-node scripts/vincular-executante-unidade.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const executantesSemUnidade = await prisma.usuario.findMany({
    where: { tipo: 'EXECUTANTE', ativo: true, unidadeExecutanteId: null },
    select: { id: true, nome: true, email: true }
  });

  if (executantesSemUnidade.length === 0) {
    console.log('Nenhum usuário EXECUTANTE sem unidade vinculada.');
    return;
  }

  const primeiraUnidade = await prisma.unidadeSaude.findFirst({
    where: { executante: 1 },
    select: { id: true, cnes: true, nome: true }
  });

  if (!primeiraUnidade) {
    console.log('Nenhuma unidade executante (executante=1) no banco. Cadastre em Unidades Executantes.');
    return;
  }

  console.log(`Vinculando ${executantesSemUnidade.length} usuário(s) EXECUTANTE à unidade: ${primeiraUnidade.cnes} - ${primeiraUnidade.nome}`);

  for (const u of executantesSemUnidade) {
    await prisma.usuario.update({
      where: { id: u.id },
      data: { unidadeExecutanteId: primeiraUnidade.id }
    });
    console.log(`  OK: ${u.email}`);
  }

  console.log('Concluído. Peça ao usuário fazer logout e login para atualizar os dados no frontend.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
