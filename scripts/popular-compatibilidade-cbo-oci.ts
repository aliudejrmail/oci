import { prisma } from '../src/database/prisma';

async function popularCompatibilidadeCboOci() {
  console.log('🔄 Povoando compatibilidade_cbo (OCI ↔ CBO) a partir dos dados SIGTAP...\n');

  try {
    // 1. Verificar situação atual
    const [ociTotal, cboAtual] = await Promise.all([
      prisma.procedimentoOci.count(),
      prisma.compatibilidadeCbo.count()
    ]);
    
    console.log('📊 Situação atual:');
    console.log('- Procedimentos OCI:', ociTotal);
    console.log('- Compatibilidades CBO existentes:', cboAtual);

    // 2. Buscar procedimentos OCI com códigos SIGTAP
    const procedimentosOci = await prisma.procedimentoOci.findMany({
      where: {
        codigoSigtap: { not: null }
      },
      select: {
        id: true,
        codigo: true,
        codigoSigtap: true,
        nome: true
      }
    });

    console.log('\n🔍 Procedimentos OCI com códigos SIGTAP:', procedimentosOci.length);

    if (procedimentosOci.length === 0) {
      console.log('⚠️ Nenhum procedimento OCI tem código SIGTAP associado!');
      return;
    }

    // 3. Para cada procedimento OCI, buscar CBOs compatíveis via SIGTAP
    let totalInseridos = 0;
    let processados = 0;

    for (const oci of procedimentosOci) {
      processados++;
      console.log(`\n[${processados}/${procedimentosOci.length}] Processando OCI ${oci.codigo}...`);

      // Buscar procedimento SIGTAP correspondente
      const procedimentoSigtap = await prisma.procedimentoSigtap.findFirst({
        where: { codigo: oci.codigoSigtap! } // Non-null assertion pois já filtramos apenas os com codigoSigtap
      });

      if (!procedimentoSigtap) {
        console.log(`⚠️ Código SIGTAP ${oci.codigoSigtap} não encontrado na tabela SIGTAP`);
        continue;
      }

      // Buscar CBOs compatíveis com este procedimento SIGTAP
      const cbosSigtap = await prisma.compatibilidadeCboSigtap.findMany({
        where: { procedimentoSigtapId: procedimentoSigtap.id },
        select: {
          cboCodigo: true,
          cboDescricao: true
        }
      });

      if (cbosSigtap.length === 0) {
        console.log(`  ⚠️ Nenhum CBO encontrado para SIGTAP ${oci.codigoSigtap}`);
        continue;
      }

      // Verificar se já existem compatibilidades para este OCI
      const compatibilidadesExistentes = await prisma.compatibilidadeCbo.findMany({
        where: { procedimentoOciId: oci.id },
        select: { cboCodigo: true }
      });
      const cbosExistentes = new Set(compatibilidadesExistentes.map(c => c.cboCodigo));

      // Filtrar CBOs que ainda não foram inseridos
      const cbosParaInserir = cbosSigtap.filter(cbo => !cbosExistentes.has(cbo.cboCodigo));

      if (cbosParaInserir.length === 0) {
        console.log(`  ✅ ${cbosSigtap.length} CBOs já existem para este procedimento`);
        continue;
      }

      // Inserir compatibilidades
      const dadosParaInserir = cbosParaInserir.map(cbo => ({
        procedimentoOciId: oci.id,
        cboCodigo: cbo.cboCodigo,
        cboDescricao: cbo.cboDescricao
      }));

      const resultado = await prisma.compatibilidadeCbo.createMany({
        data: dadosParaInserir,
        skipDuplicates: true
      });

      console.log(`  ✅ ${resultado.count} CBOs inseridos (de ${cbosSigtap.length} encontrados)`);
      totalInseridos += resultado.count;

      // Mostrar alguns CBOs inseridos como exemplo
      if (dadosParaInserir.length > 0) {
        console.log(`     Exemplos: ${dadosParaInserir.slice(0, 3).map(c => c.cboCodigo).join(', ')}...`);
      }
    }

    // 4. Relatório final
    const compatibilidadesFinal = await prisma.compatibilidadeCbo.count();
    console.log('\n📊 Resultado final:');
    console.log('- Total de compatibilidades inseridas:', totalInseridos);
    console.log('- Total de compatibilidades na tabela:', compatibilidadesFinal);
    console.log('- Procedimentos OCI processados:', processados);

    // 5. Estatísticas por procedimento
    const estatisticas = await prisma.procedimentoOci.findMany({
      where: {
        compatibilidadeCbo: {
          some: {}
        }
      },
      select: {
        codigo: true,
        nome: true,
        _count: {
          select: {
            compatibilidadeCbo: true
          }
        }
      },
      take: 5
    });

    console.log('\n🔍 Exemplos de procedimentos OCI com CBOs mapeados:');
    estatisticas.forEach(proc => {
      console.log(`- OCI ${proc.codigo}: ${proc._count.compatibilidadeCbo} CBOs - ${proc.nome}`);
    });

    console.log('\n✅ Povoamento concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao popular compatibilidades CBO:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularCompatibilidadeCboOci()
    .catch(console.error)
    .finally(() => process.exit());
}