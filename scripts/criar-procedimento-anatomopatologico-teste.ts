/**
 * Script para criar um procedimento anatomo-patológico para teste.
 * 
 * Uso: npx ts-node scripts/criar-procedimento-anatomopatologico-teste.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function criarProcedimentoTeste(): Promise<any> {
  console.log('🔬 Criando procedimento anatomo-patológico para teste...\n')
  
  try {
    // 1. Buscar primeira OCI ativa
    const oci = await prisma.oci.findFirst({
      where: { ativo: true }
    })

    if (!oci) {
      console.log('❌ Nenhuma OCI ativa encontrada.')
      return
    }

    console.log(`📋 Usando OCI: ${oci.codigo} - ${oci.nome}`)

    // 2. Verificar se já existe um procedimento anatomo-patológico nesta OCI
    const procedimentoExistente = await prisma.procedimentoOci.findFirst({
      where: {
        ociId: oci.id,
        nome: { contains: 'ANATOMO-PATOLÓGICO', mode: 'insensitive' }
      }
    })

    if (procedimentoExistente) {
      console.log(`✅ Procedimento anatomo-patológico já existe: ${procedimentoExistente.nome}`)
      return procedimentoExistente
    }

    // 3. Criar procedimento anatomo-patológico
    const novoProcedimento = await prisma.procedimentoOci.create({
      data: {
        ociId: oci.id,
        codigo: '0101010010', // Código SIGTAP para exame anatomo-patológico
        codigoSigtap: '0101010010',
        nome: 'EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - PEÇA CIRÚRGICA',
        tipo: 'EXAME',
        ordem: 10,
        obrigatorio: true,
        descricao: 'Exame anatomo-patológico para teste da funcionalidade de aguardando resultado'
      }
    })

    console.log(`✅ Procedimento criado: ${novoProcedimento.nome}`)
    console.log(`🆔 ID: ${novoProcedimento.id}`)
    console.log(`📋 Código: ${novoProcedimento.codigo}`)
    console.log(`✅ Obrigatório: ${novoProcedimento.obrigatorio}`)

    // 4. Buscar uma solicitação ativa para criar execução de teste
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: {
        ociId: oci.id,
        deletedAt: null,
        status: { notIn: ['CONCLUIDA', 'CANCELADA'] }
      }
    })

    if (solicitacao) {
      // 5. Criar execução do procedimento se não existir
      const execucaoExistente = await prisma.execucaoProcedimento.findFirst({
        where: {
          solicitacaoId: solicitacao.id,
          procedimentoId: novoProcedimento.id
        }
      })

      if (!execucaoExistente) {
        const novaExecucao = await prisma.execucaoProcedimento.create({
          data: {
            solicitacaoId: solicitacao.id,
            procedimentoId: novoProcedimento.id,
            status: 'PENDENTE'
          }
        })

        console.log(`✅ Execução criada para solicitação: ${solicitacao.numeroProtocolo}`)
        console.log(`🆔 Execução ID: ${novaExecucao.id}`)
      } else {
        console.log(`✅ Execução já existe para solicitação: ${solicitacao.numeroProtocolo}`)
      }
    } else {
      console.log('⚠️  Nenhuma solicitação ativa encontrada para criar execução de teste.')
    }

    return novoProcedimento

  } catch (error) {
    console.error('❌ Erro ao criar procedimento:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  criarProcedimentoTeste()
}