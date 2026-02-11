
import { PrismaClient } from '@prisma/client';
import { RelatoriosService, FiltrosRelatorio } from '../src/services/relatorios.service';

const prisma = new PrismaClient();
const service = new RelatoriosService(prisma);

async function main() {
    console.log('--- DIAGNOSTICO CNES ---');

    const filtros: FiltrosRelatorio = {
        dataInicio: '2023-01-01',
        dataFim: '2026-12-31'
    };

    try {
        const resultado = await service.procedimentosExecutados(filtros, 10);
        const execs = resultado.execucoes as any[];

        console.log(`Encontrados: ${execs.length}`);

        // Filtrar um que tenha unidadeExecutoraRef (e consequentemente unidadeExecutante)
        const comUnidade = execs.find(e => e.unidadeExecutoraRef != null);

        if (comUnidade) {
            console.log('Registro com unidadeExecutora encontrado:', comUnidade.id);
            const unidade = comUnidade.unidadeExecutante;

            if (unidade && unidade.nome) {
                console.log('Nome da unidade executante:', unidade.nome);
                // Verificar padrão CNES - NOME
                // CNES é geralmente numérico de 7 digitos
                const regex = /^\d+\s+-\s+.+/;
                if (regex.test(unidade.nome)) {
                    console.log('✅ SUCESSO: Nome está no formato "CNES - NOME".');
                } else if (unidade.cnes) {
                    console.log('⚠️ AVISO: Nome não parece estar formatado, mas CNES existe:', unidade.cnes);
                    console.log('Formato atual:', unidade.nome);
                } else {
                    console.log('⚠️ AVISO: Unidade sem CNES no banco?');
                    console.log('Objeto unidade:', unidade);
                }

            } else {
                console.log('❌ FALHA: Nome não encontrado em unidadeExecutante');
            }
        } else {
            console.log('⚠️ AVISO: Nenhum registro com unidade executora vinculada encontrado.');
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
