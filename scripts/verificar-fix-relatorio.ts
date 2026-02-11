
import { PrismaClient } from '@prisma/client';
import { RelatoriosService, FiltrosRelatorio } from '../src/services/relatorios.service';

const prisma = new PrismaClient();
const service = new RelatoriosService(prisma);

async function main() {
    console.log('Iniciando verificação do relatório de procedimentos executados...');

    // Definir filtros de teste - incluindo 2026
    const filtros: FiltrosRelatorio = {
        dataInicio: '2023-01-01',
        dataFim: '2026-12-31'
    };

    try {
        const resultado = await service.procedimentosExecutados(filtros, 5);

        console.log(`Total de registros encontrados: ${resultado.total}`);

        if (resultado.execucoes.length === 0) {
            console.warn('Nenhuma execução encontrada para verificar. Tente ajustar os filtros de data.');
        } else {
            const procs = resultado.execucoes as any[];
            const primeiro = procs[0];

            console.log('Exemplo do primeiro registro retornado:');
            // console.log(JSON.stringify(primeiro, null, 2));

            if (primeiro.unidadeExecutante && primeiro.unidadeExecutante.nome) {
                console.log(`✅ SUCESSO: unidadeExecutante.nome está presente: "${primeiro.unidadeExecutante.nome}"`);
            } else if (primeiro.unidadeExecutante) {
                console.log('⚠️ AVISO: unidadeExecutante existe mas não tem a propriedade nome.');
                console.log(primeiro.unidadeExecutante);
            } else {
                console.error('❌ ERRO: unidadeExecutante NÃO está presente no resultado.');
                console.log('Chaves disponíveis:', Object.keys(primeiro));
            }
        }

    } catch (error) {
        console.error('Erro ao executar verificação:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
