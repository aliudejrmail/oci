/**
 * Valida dados do banco para exibição de agendamentos ao perfil EXECUTANTE.
 * Mostra: usuários EXECUTANTE com unidade, execuções AGENDADAS, e simulação do filtro.
 *
 * Uso: npx ts-node scripts/validar-agendamentos-executante.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function labelUnidade(cnes: string, nome: string): string {
  return `${cnes} - ${nome}`;
}

async function main() {
  console.log('=== Validação: agendamentos para perfil EXECUTANTE ===\n');

  // 1) Usuários com tipo EXECUTANTE
  const usuariosExecutantes = await prisma.usuario.findMany({
    where: { tipo: 'EXECUTANTE', ativo: true },
    select: {
      id: true,
      nome: true,
      email: true,
      unidadeExecutanteId: true,
      unidadeExecutante: { select: { id: true, cnes: true, nome: true } }
    }
  });

  console.log('--- 1) Usuários EXECUTANTE ---');
  if (usuariosExecutantes.length === 0) {
    console.log('Nenhum usuário com tipo EXECUTANTE encontrado.\n');
  } else {
    console.log('(Se unidadeExecutanteId for null, o backend filtra por executanteId; como agendamentos por unidade têm executanteId null, a lista fica vazia. Vincule a unidade no cadastro de usuários.)');
    for (const u of usuariosExecutantes) {
      const label = u.unidadeExecutante ? labelUnidade(u.unidadeExecutante.cnes, u.unidadeExecutante.nome) : '(sem unidade)';
      console.log(`  ${u.email} | unidadeExecutanteId: ${u.unidadeExecutanteId ?? 'null'} | label esperado: "${label}"`);
    }
    console.log('');
  }

  // 2) Unidades com executante=1 (para conferir CNES/nome)
  const unidadesExecutantes = await prisma.unidadeSaude.findMany({
    where: { executante: 1 },
    select: { id: true, cnes: true, nome: true }
  });
  console.log('--- 2) Unidades executantes (executante=1) ---');
  for (const u of unidadesExecutantes) {
    console.log(`  ${u.cnes} - ${u.nome} (id: ${u.id})`);
  }
  console.log('');

  // 3) Execuções com status AGENDADO (valores crus no banco)
  const execucoesAgendadas = await prisma.execucaoProcedimento.findMany({
    where: { status: 'AGENDADO' },
    select: {
      id: true,
      solicitacaoId: true,
      status: true,
      unidadeExecutora: true,
      executanteId: true
    }
  });

  console.log('--- 3) Execuções com status AGENDADO (valores no banco) ---');
  if (execucoesAgendadas.length === 0) {
    console.log('Nenhuma execução com status AGENDADO.\n');
  } else {
    for (const e of execucoesAgendadas) {
      const unidadeStr = e.unidadeExecutora == null ? 'null' : JSON.stringify(e.unidadeExecutora);
      console.log(`  solicitacaoId: ${e.solicitacaoId} | unidadeExecutora: ${unidadeStr} | executanteId: ${e.executanteId ?? 'null'}`);
    }
    console.log('');
  }

  // 4) Simular filtro do service: para cada EXECUTANTE com unidade, quantas solicitações têm execução AGENDADA naquela unidade?
  console.log('--- 4) Simulação do filtro (solicitações que deveriam aparecer para cada EXECUTANTE) ---');
  for (const usuario of usuariosExecutantes) {
    if (!usuario.unidadeExecutanteId || !usuario.unidadeExecutante) {
      console.log(`  ${usuario.email}: sem unidade vinculada → filtro usaria executanteId (não unidadeExecutora).`);
      continue;
    }
    const label = labelUnidade(usuario.unidadeExecutante.cnes, usuario.unidadeExecutante.nome);
    const solicitacoesComAgendamentoNaUnidade = await prisma.solicitacaoOci.findMany({
      where: {
        execucoes: {
          some: {
            status: 'AGENDADO',
            unidadeExecutora: label
          }
        }
      },
      select: { id: true, numeroProtocolo: true, status: true }
    });
    console.log(`  ${usuario.email} | label: "${label}"`);
    console.log(`    → Solicitações com execução AGENDADA e unidadeExecutora = label: ${solicitacoesComAgendamentoNaUnidade.length}`);
    if (solicitacoesComAgendamentoNaUnidade.length > 0) {
      solicitacoesComAgendamentoNaUnidade.forEach((s) => console.log(`       - ${s.numeroProtocolo} (${s.id}) status=${s.status}`));
    }
    // Verificar se há diferença por trim ou formato
    const agendadasNaUnidade = execucoesAgendadas.filter((e) => e.unidadeExecutora && e.unidadeExecutora.trim() === label);
    if (agendadasNaUnidade.length === 0 && execucoesAgendadas.some((e) => e.unidadeExecutora && e.unidadeExecutora.includes(usuario.unidadeExecutante!.cnes))) {
      console.log('    [AVISO] Há execuções com unidadeExecutora contendo o CNES desta unidade, mas match exato falhou. Valores:');
      execucoesAgendadas
        .filter((e) => e.unidadeExecutora && e.unidadeExecutora.includes(usuario.unidadeExecutante!.cnes))
        .forEach((e) => console.log(`       unidadeExecutora no DB: ${JSON.stringify(e.unidadeExecutora)}`));
    }
  }

  console.log('\n=== Como corrigir: EXECUTANTE sem unidade ===');
  const executantesSemUnidade = usuariosExecutantes.filter((u) => !u.unidadeExecutanteId);
  if (executantesSemUnidade.length > 0 && unidadesExecutantes.length > 0) {
    console.log('Usuários EXECUTANTE sem unidade vinculada não veem agendamentos por unidade.');
    console.log('Solução: no cadastro de Usuários (como ADMIN/GESTOR), edite o usuário EXECUTANTE e defina "Unidade executante" para a unidade desejada.');
    console.log('Ex.: Unidade disponível:', unidadesExecutantes[0].cnes, '-', unidadesExecutantes[0].nome);
  }

  console.log('\n=== Fim da validação ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
