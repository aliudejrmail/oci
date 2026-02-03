/**
 * Script para corrigir registros existentes no banco:
 * Quando uma consulta/teleconsulta está REALIZADO e outra está PENDENTE/AGENDADO,
 * atualiza a PENDENTE/AGENDADO para DISPENSADO.
 *
 * Execute: npm run corrigir:dispensado
 * Ou: npx ts-node scripts/corrigir-dispensado-consulta-teleconsulta.ts
 */

import { PrismaClient } from '@prisma/client';
import { STATUS_EXECUCAO } from '../src/constants/status-execucao';

function isProcedimentoConsultaOuTeleconsulta(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return n.includes('consulta') || n.includes('teleconsulta');
}

async function main() {
  const prisma = new PrismaClient();

  const execucoes = await prisma.execucaoProcedimento.findMany({
    where: { status: { in: ['PENDENTE', 'AGENDADO'] } },
    include: { procedimento: true, solicitacao: true }
  });

  const consultaTeleconsultaPendentes = execucoes.filter((e) =>
    isProcedimentoConsultaOuTeleconsulta(e.procedimento.nome)
  );

  let atualizados = 0;

  for (const exec of consultaTeleconsultaPendentes) {
    const outrasExecucoes = await prisma.execucaoProcedimento.findMany({
      where: {
        solicitacaoId: exec.solicitacaoId,
        id: { not: exec.id }
      },
      include: { procedimento: true }
    });

    const outroConsultaExecutado = outrasExecucoes.some(
      (e) =>
        isProcedimentoConsultaOuTeleconsulta(e.procedimento.nome) &&
        e.status === STATUS_EXECUCAO.REALIZADO
    );

    if (outroConsultaExecutado) {
      await prisma.execucaoProcedimento.update({
        where: { id: exec.id },
        data: { status: STATUS_EXECUCAO.DISPENSADO }
      });
      atualizados++;
      console.log(
        `Atualizado: ${exec.procedimento.nome} (solicitação ${exec.solicitacaoId}) -> DISPENSADO`
      );
    }
  }

  console.log(`\nConcluído. ${atualizados} registro(s) atualizado(s) para DISPENSADO.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
