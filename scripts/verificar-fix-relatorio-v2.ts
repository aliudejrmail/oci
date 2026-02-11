
import { PrismaClient } from '@prisma/client';
import { RelatoriosService, FiltrosRelatorio } from '../src/services/relatorios.service';

const prisma = new PrismaClient();
const service = new RelatoriosService(prisma);

async function main() {
    console.log('--- DIAGNOSTICO ---');

    const filtros: FiltrosRelatorio = {
        dataInicio: '2023-01-01',
        dataFim: '2026-12-31'
    };

    try {
        const resultado = await service.procedimentosExecutados(filtros, 10);
        const execs = resultado.execucoes as any[];

        console.log(`Encontrados: ${execs.length}`);

        // Filtrar um que tenha unidadeExecutoraId nao nulo
        const comUnidade = execs.find(e => e.unidadeExecutoraId != null);

        if (comUnidade) {
            console.log('Registro com unidadeExecutoraId encontrado:', comUnidade.id);
            console.log('unidadeExecutoraId:', comUnidade.unidadeExecutoraId);
            console.log('unidadeExecutoraRef:', comUnidade.unidadeExecutoraRef);
            console.log('unidadeExecutante:', comUnidade.unidadeExecutante);

            if (comUnidade.unidadeExecutante && comUnidade.unidadeExecutante.nome) {
                console.log('✅ SUCESSO: Nome da unidade executante:', comUnidade.unidadeExecutante.nome);
            } else {
                console.log('❌ FALHA: Nome não encontrado em unidadeExecutante');
            }
        } else {
            console.log('⚠️ AVISO: Nenhum registro com unidadeExecutoraId encontrado nas primeiras 10 execuções.');
            // Tentar pegar qq um
            if (execs.length > 0) {
                console.log('Exemplo sem unidade:', execs[0]);
            }
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
