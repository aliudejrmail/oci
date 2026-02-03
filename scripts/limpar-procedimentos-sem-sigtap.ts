import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para remover procedimentos que NÃO possuem código SIGTAP
 * e as OCIs que ficarem sem procedimentos válidos.
 * 
 * Uso:
 *   npx ts-node scripts/limpar-procedimentos-sem-sigtap.ts
 *   npx ts-node scripts/limpar-procedimentos-sem-sigtap.ts --confirmar
 */
async function limparProcedimentosSemSigtap() {
  const confirmar = process.argv.includes('--confirmar');

  try {
    console.log('🔍 Analisando procedimentos sem código SIGTAP...\n');

    // 1. Buscar todos os procedimentos sem código SIGTAP
    const procedimentosSemSigtap = await prisma.procedimentoOci.findMany({
      where: { codigoSigtap: null },
      include: { oci: { select: { codigo: true, nome: true } } }
    });

    if (procedimentosSemSigtap.length === 0) {
      console.log('✅ Nenhum procedimento sem código SIGTAP encontrado.');
      console.log('   Todos os procedimentos já possuem código SIGTAP válido.\n');
      return;
    }

    console.log(`📊 Encontrados ${procedimentosSemSigtap.length} procedimento(s) sem código SIGTAP:\n`);
    
    // Agrupar por OCI
    const porOci = new Map<string, typeof procedimentosSemSigtap>();
    for (const proc of procedimentosSemSigtap) {
      const ociCodigo = proc.oci.codigo;
      if (!porOci.has(ociCodigo)) {
        porOci.set(ociCodigo, []);
      }
      porOci.get(ociCodigo)!.push(proc);
    }

    // Exibir resumo
    for (const [ociCodigo, procs] of porOci.entries()) {
      const ociNome = procs[0].oci.nome;
      console.log(`   📦 OCI ${ociCodigo} - ${ociNome}:`);
      for (const proc of procs) {
        console.log(`      - ${proc.codigo} - ${proc.nome}`);
      }
      console.log('');
    }

    // 2. Verificar quais OCIs ficarão sem procedimentos
    const ocisAfetadas = await prisma.oci.findMany({
      where: {
        procedimentos: {
          some: {}
        }
      },
      include: {
        procedimentos: {
          select: {
            id: true,
            codigoSigtap: true
          }
        },
        solicitacoes: {
          select: { id: true }
        }
      }
    });

    const ocisQueSeraoRemovidas: string[] = [];
    const ocisSolicitacoes: string[] = [];

    for (const oci of ocisAfetadas) {
      const procedimentosComSigtap = oci.procedimentos.filter(p => p.codigoSigtap != null);
      if (procedimentosComSigtap.length === 0) {
        ocisQueSeraoRemovidas.push(`${oci.codigo} - ${oci.nome}`);
        
        if (oci.solicitacoes.length > 0) {
          ocisSolicitacoes.push(`${oci.codigo} (${oci.solicitacoes.length} solicitação(ões))`);
        }
      }
    }

    if (ocisQueSeraoRemovidas.length > 0) {
      console.log(`⚠️  ${ocisQueSeraoRemovidas.length} OCI(s) ficarão sem procedimentos e serão removidas:\n`);
      for (const oci of ocisQueSeraoRemovidas) {
        console.log(`   - ${oci}`);
      }
      console.log('');
    }

    if (ocisSolicitacoes.length > 0) {
      console.log(`❌ ERRO: Não é possível remover as seguintes OCIs pois possuem solicitações:\n`);
      for (const oci of ocisSolicitacoes) {
        console.log(`   - ${oci}`);
      }
      console.log('\n💡 Remova primeiro as solicitações vinculadas ou desative as OCIs ao invés de deletá-las.\n');
      return;
    }

    // 3. Solicitar confirmação
    if (!confirmar) {
      console.log('⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n');
      console.log('📋 Resumo das ações:');
      console.log(`   • ${procedimentosSemSigtap.length} procedimento(s) sem código SIGTAP serão DELETADOS`);
      if (ocisQueSeraoRemovidas.length > 0) {
        console.log(`   • ${ocisQueSeraoRemovidas.length} OCI(s) vazias serão DELETADAS`);
      }
      console.log('\n🔄 Para executar a limpeza, execute novamente com o parâmetro --confirmar:');
      console.log('   npx ts-node scripts/limpar-procedimentos-sem-sigtap.ts --confirmar\n');
      return;
    }

    // 4. Executar limpeza
    console.log('🗑️  Executando limpeza...\n');

    // 4.1 Deletar procedimentos sem SIGTAP
    const resultDeleteProc = await prisma.procedimentoOci.deleteMany({
      where: { codigoSigtap: null }
    });
    console.log(`✅ ${resultDeleteProc.count} procedimento(s) deletado(s)`);

    // 4.2 Deletar OCIs que ficaram sem procedimentos
    const ocisVazias = await prisma.oci.findMany({
      where: {
        procedimentos: { none: {} }
      }
    });

    if (ocisVazias.length > 0) {
      const resultDeleteOci = await prisma.oci.deleteMany({
        where: {
          id: { in: ocisVazias.map(o => o.id) }
        }
      });
      console.log(`✅ ${resultDeleteOci.count} OCI(s) vazia(s) deletada(s)`);
    }

    console.log('\n✨ Limpeza concluída com sucesso!\n');
    console.log('📊 Estado final:');
    
    const totalOcis = await prisma.oci.count();
    const totalProc = await prisma.procedimentoOci.count();
    const procComSigtap = await prisma.procedimentoOci.count({
      where: { codigoSigtap: { not: null } }
    });

    console.log(`   • ${totalOcis} OCI(s) cadastrada(s)`);
    console.log(`   • ${totalProc} procedimento(s) total`);
    console.log(`   • ${procComSigtap} procedimento(s) com código SIGTAP (${totalProc === procComSigtap ? '100%' : Math.round(procComSigtap / totalProc * 100) + '%'})`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao limpar procedimentos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

limparProcedimentosSemSigtap();
