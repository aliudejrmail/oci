import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para remover TODAS as OCIs e procedimentos do banco de dados.
 * Útil para recomeçar apenas com as OCIs oficiais da SIGTAP.
 * 
 * Uso:
 *   npx ts-node scripts/limpar-todas-ocis.ts
 *   npx ts-node scripts/limpar-todas-ocis.ts --confirmar
 */
async function limparTodasOcis() {
  const confirmar = process.argv.includes('--confirmar');

  try {
    console.log('🔍 Verificando OCIs no banco de dados...\n');

    // 1. Buscar todas as OCIs
    const ocis = await prisma.oci.findMany({
      include: {
        procedimentos: { select: { id: true, codigo: true, nome: true } },
        solicitacoes: { select: { id: true } }
      }
    });

    if (ocis.length === 0) {
      console.log('✅ Nenhuma OCI encontrada no banco.');
      console.log('   O banco já está limpo.\n');
      return;
    }

    console.log(`📊 Encontradas ${ocis.length} OCI(s) no banco:\n`);
    
    let totalProcedimentos = 0;
    let totalSolicitacoes = 0;
    const ocisComSolicitacoes: string[] = [];

    for (const oci of ocis) {
      const numProc = oci.procedimentos.length;
      const numSolic = oci.solicitacoes.length;
      totalProcedimentos += numProc;
      totalSolicitacoes += numSolic;

      console.log(`   📦 ${oci.codigo} - ${oci.nome}`);
      console.log(`      • ${numProc} procedimento(s)`);
      
      if (numSolic > 0) {
        console.log(`      ⚠️  ${numSolic} solicitação(ões) vinculada(s)`);
        ocisComSolicitacoes.push(`${oci.codigo} (${numSolic} solicitação(ões))`);
      }
      console.log('');
    }

    // 2. Verificar se há solicitações
    if (ocisComSolicitacoes.length > 0) {
      console.log(`❌ ERRO: Não é possível remover as seguintes OCIs pois possuem solicitações:\n`);
      for (const oci of ocisComSolicitacoes) {
        console.log(`   - ${oci}`);
      }
      console.log('\n💡 Opções:');
      console.log('   1. Remova primeiro as solicitações vinculadas');
      console.log('   2. Use o script limpar-procedimentos-sem-sigtap.ts para remover apenas procedimentos sem código SIGTAP');
      console.log('   3. Desative as OCIs ao invés de deletá-las\n');
      return;
    }

    // 3. Solicitar confirmação
    if (!confirmar) {
      console.log('⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n');
      console.log('📋 Resumo das ações:');
      console.log(`   • ${ocis.length} OCI(s) serão DELETADAS`);
      console.log(`   • ${totalProcedimentos} procedimento(s) serão DELETADOS`);
      console.log('\n🔄 Para executar a limpeza, execute novamente com o parâmetro --confirmar:');
      console.log('   npx ts-node scripts/limpar-todas-ocis.ts --confirmar\n');
      console.log('💡 Após a limpeza, execute:');
      console.log('   npm run importar:ocis-sigtap\n');
      return;
    }

    // 4. Executar limpeza
    console.log('🗑️  Executando limpeza...\n');

    // 4.1 Deletar todos os procedimentos (cascade deletará compatibilidades e execuções)
    const resultDeleteProc = await prisma.procedimentoOci.deleteMany({});
    console.log(`✅ ${resultDeleteProc.count} procedimento(s) deletado(s)`);

    // 4.2 Deletar todas as OCIs
    const resultDeleteOci = await prisma.oci.deleteMany({});
    console.log(`✅ ${resultDeleteOci.count} OCI(s) deletada(s)`);

    console.log('\n✨ Limpeza concluída com sucesso!\n');
    console.log('📊 Estado final: 0 OCIs, 0 procedimentos\n');
    console.log('💡 Execute agora para importar as OCIs oficiais da SIGTAP:');
    console.log('   npm run importar:ocis-sigtap\n');

  } catch (error) {
    console.error('❌ Erro ao limpar OCIs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

limparTodasOcis();
