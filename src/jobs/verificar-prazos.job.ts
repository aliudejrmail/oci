import { prisma } from '../database/prisma';
import { SolicitacoesService } from '../services/solicitacoes.service';

const service = new SolicitacoesService(prisma);

/**
 * Job para verificar e atualizar prazos vencidos
 * Deve ser executado periodicamente (ex: via cron job)
 */
export async function verificarPrazosVencidos() {
  try {
    console.log('🔍 Verificando prazos vencidos...');
    const quantidade = await service.verificarPrazosVencidos();
    console.log(`✅ ${quantidade} solicitação(ões) atualizada(s)`);
    return quantidade;
  } catch (error) {
    console.error('❌ Erro ao verificar prazos:', error);
    throw error;
  }
}

// Se executado diretamente (para testes)
if (require.main === module) {
  verificarPrazosVencidos()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
