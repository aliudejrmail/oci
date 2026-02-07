import { prisma } from '../src/database/prisma';

async function popularCbosManuais() {
  console.log('🔄 Povoando compatibilidade_cbo com mapeamentos manuais...\n');

  try {
    // Mapeamentos manuais baseados em tipos comuns de procedimentos
    const mapeamentos = [
      // Consultas médicas - CBOs médicos diversos
      {
        filtro: { nome: { contains: 'CONSULTA MÉDICA' }},
        cbos: [
          { codigo: '225103', descricao: 'MEDICO INFECTOLOGISTA' },
          { codigo: '225120', descricao: 'MEDICO CARDIOLOGISTA' },
          { codigo: '225250', descricao: 'MEDICO GINECOLOGISTA E OBSTETRA' },
          { codigo: '225165', descricao: 'MEDICO GASTROENTEROLOGISTA' }
        ]
      },
      // Teleconsultas
      {
        filtro: { nome: { contains: 'TELECONSULTA' }},
        cbos: [
          { codigo: '225103', descricao: 'MEDICO INFECTOLOGISTA' },
          { codigo: '225120', descricao: 'MEDICO CARDIOLOGISTA' }
        ]
      },
      // Ultrassonografias - Radiologistas
      {
        filtro: { nome: { contains: 'ULTRASSONOGRAFIA' }},
        cbos: [
          { codigo: '225142', descricao: 'MEDICO DA ESTRATEGIA DE SAUDE DA FAMILIA' }
        ]
      },
      // Cirurgias - Cirurgiões diversos
      {
        filtro: { nome: { contains: 'CIRURG' }},
        cbos: [
          { codigo: '225203', descricao: 'MEDICO EM CIRURGIA VASCULAR' },
          { codigo: '225235', descricao: 'MEDICO CIRURGIAO PLASTICO' },
          { codigo: '225240', descricao: 'MEDICO CIRURGIAO TORACICO' }
        ]
      },
      // Exames diagnósticos
      {
        filtro: { 
          OR: [
            { nome: { contains: 'EXAME' }},
            { nome: { contains: 'BIOPSIA' }},
            { nome: { contains: 'PUNÇÃO' }}
          ]
        },
        cbos: [
          { codigo: '225142', descricao: 'MEDICO DA ESTRATEGIA DE SAUDE DA FAMILIA' },
          { codigo: '225255', descricao: 'MEDICO MASTOLOGISTA' }
        ]
      }
    ];

    let totalInserido = 0;

    for (const mapeamento of mapeamentos) {
      console.log(`🔍 Buscando procedimentos: ${JSON.stringify(mapeamento.filtro)}...`);
      
      const procedimentos = await prisma.procedimentoOci.findMany({
        where: mapeamento.filtro,
        select: { id: true, codigo: true, nome: true }
      });

      console.log(`  Encontrados: ${procedimentos.length} procedimentos`);

      for (const procedimento of procedimentos) {
        // Verificar se já existem CBOs para este procedimento
        const existentes = await prisma.compatibilidadeCbo.count({
          where: { procedimentoOciId: procedimento.id }
        });

        if (existentes > 0) {
          console.log(`  ⚪ OCI ${procedimento.codigo}: ${existentes} CBOs já existem`);
          continue;
        }

        // Inserir CBOs para este procedimento
        const dadosInserir = mapeamento.cbos.map(cbo => ({
          procedimentoOciId: procedimento.id,
          cboCodigo: cbo.codigo,
          cboDescricao: cbo.descricao
        }));

        const resultado = await prisma.compatibilidadeCbo.createMany({
          data: dadosInserir,
          skipDuplicates: true
        });

        totalInserido += resultado.count;
        console.log(`  ✅ OCI ${procedimento.codigo}: ${resultado.count} CBOs inseridos - ${procedimento.nome.substring(0,50)}...`);
      }
    }

    // Relatório final
    const totalFinal = await prisma.compatibilidadeCbo.count();
    const procedimentosComCbo = await prisma.procedimentoOci.count({
      where: { compatibilidadeCbo: { some: {} }}
    });

    console.log('\n📊 Resultado final:');
    console.log('- Total de compatibilidades inseridas:', totalInserido);
    console.log('- Total de compatibilidades na tabela:', totalFinal);
    console.log('- Procedimentos OCI com CBOs mapeados:', procedimentosComCbo);

    console.log('\n✅ Mapeamento manual concluído!');

  } catch (error) {
    console.error('❌ Erro no mapeamento manual:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularCbosManuais()
    .catch(console.error)
    .finally(() => process.exit());
}