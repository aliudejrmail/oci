import { prisma } from '../src/database/prisma';

async function popularCbosOrfaos() {
  console.log('🔄 Povoando tabela auxiliar CBO com CBOs órfãos do SIGTAP...\n');

  try {
    // 1. Buscar CBOs existentes na tabela auxiliar
    const cbosExistentes = await prisma.cbo.findMany({
      select: { codigo: true }
    });
    const codigosExistentes = new Set(cbosExistentes.map((c: any) => c.codigo));
    console.log('📋 CBOs já existentes na tabela auxiliar:', codigosExistentes.size);

    // 2. Buscar todos os CBOs únicos do SIGTAP com suas descrições
    const cbosSigtap = await prisma.compatibilidadeCboSigtap.groupBy({
      by: ['cboCodigo', 'cboDescricao'],
      _count: {
        cboCodigo: true
      }
    });
    
    console.log('📋 CBOs únicos no SIGTAP:', cbosSigtap.length);

    // 3. Filtrar apenas CBOs órfãos (não existem na tabela auxiliar)
    const cbosOrfaos = cbosSigtap.filter((cbo: any) => !codigosExistentes.has(cbo.cboCodigo));
    console.log('⚠️  CBOs órfãos encontrados:', cbosOrfaos.length);

    if (cbosOrfaos.length === 0) {
      console.log('✅ Não há CBOs órfãos para inserir!');
      return;
    }

    // 4. Preparar dados para inserção
    const dadosParaInserir = cbosOrfaos.map((cbo: any) => ({
      codigo: cbo.cboCodigo,
      descricao: cbo.cboDescricao || `CBO ${cbo.cboCodigo}`, // fallback se não tiver descrição
      ativo: true
    }));

    // 5. Mostrar preview dos CBOs que serão inseridos
    console.log('\n🔍 Preview dos CBOs que serão inseridos:');
    dadosParaInserir.slice(0, 10).forEach((cbo: any, idx: number) => {
      console.log(`   ${idx + 1}. CBO ${cbo.codigo}: ${cbo.descricao}`);
    });

    if (dadosParaInserir.length > 10) {
      console.log(`   ... e mais ${dadosParaInserir.length - 10} CBOs`);
    }

    // 6. Confirmar inserção
    console.log(`\n💾 Inserindo ${dadosParaInserir.length} CBOs na tabela auxiliar...`);

    // Usar createMany para inserção em lote
    const resultado = await prisma.cbo.createMany({
      data: dadosParaInserir,
      skipDuplicates: true // Pula duplicatas se existirem
    });

    console.log(`✅ ${resultado.count} CBOs inseridos com sucesso!`);

    // 7. Verificação final
    const totalCbosAgora = await prisma.cbo.count();
    console.log(`\n📊 Total de CBOs na tabela auxiliar agora: ${totalCbosAgora}`);

    // 8. Verificar se ainda há órfãos
    const cbosRestantes = await prisma.cbo.findMany({
      select: { codigo: true }
    });
    const codigosAtualizados = new Set(cbosRestantes.map((c: any) => c.codigo));
    
    const orfaosRestantes = cbosSigtap.filter((cbo: any) => !codigosAtualizados.has(cbo.cboCodigo));
    console.log(`⚠️  CBOs órfãos restantes: ${orfaosRestantes.length}`);

    if (orfaosRestantes.length === 0) {
      console.log('🎉 Todos os CBOs do SIGTAP agora têm correspondência na tabela auxiliar!');
    }

    console.log('\n✅ Operação concluída!');

  } catch (error) {
    console.error('❌ Erro ao popular CBOs:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularCbosOrfaos()
    .catch(console.error)
    .finally(() => process.exit());
}