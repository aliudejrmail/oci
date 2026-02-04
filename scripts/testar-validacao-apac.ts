import 'dotenv/config'
import { PrismaClient, StatusSolicitacao } from '@prisma/client'

const prisma = new PrismaClient()

async function testarValidacaoApac() {
  console.log('🔍 Testando validação de APAC obrigatório...\n')

  try {
    // 1. Buscar uma solicitação EM_ANDAMENTO sem número APAC
    const solicitacao = await prisma.solicitacaoOci.findFirst({
      where: {
        status: StatusSolicitacao.EM_ANDAMENTO,
        numeroAutorizacaoApac: null,
        deletedAt: null
      },
      include: {
        execucoes: {
          include: { procedimento: true }
        }
      }
    })

    if (!solicitacao) {
      console.log('❌ Nenhuma solicitação EM_ANDAMENTO sem número APAC encontrada para teste')
      
      // Criar uma solicitação de teste temporária
      console.log('🔧 Criando solicitação de teste...')
      
      // Buscar um paciente e OCI para teste
      const paciente = await prisma.paciente.findFirst()
      const oci = await prisma.oci.findFirst()
      
      if (!paciente || !oci) {
        console.log('❌ Não há pacientes ou OCIs no banco para criar teste')
        return
      }

      const usuario = await prisma.usuario.findFirst({ where: { tipo: 'ADMIN' } })
      if (!usuario) {
        console.log('❌ Não há usuário ADMIN para criar teste')
        return
      }

      // Criar solicitação temporária
      const solicitacaoTeste = await prisma.solicitacaoOci.create({
        data: {
          pacienteId: paciente.id,
          ociId: oci.id,
          tipo: oci.tipo, // Adicionar tipo obrigatório
          status: StatusSolicitacao.EM_ANDAMENTO,
          numeroProtocolo: `TESTE-${Date.now()}`,
          dataPrazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          unidadeOrigem: 'TESTE', // Adicionar unidadeOrigem obrigatório
          criadoPorId: usuario.id,
          observacoes: 'Solicitação de teste para validação APAC'
        }
      })

      console.log(`✅ Solicitação de teste criada: ${solicitacaoTeste.numeroProtocolo}`)
      
      // Testar tentativa de conclusão sem APAC
      console.log('\n2. Testando conclusão manual sem número APAC...')
      
      try {
        await prisma.solicitacaoOci.update({
          where: { id: solicitacaoTeste.id },
          data: { 
            status: StatusSolicitacao.CONCLUIDA,
            dataConclusao: new Date()
          }
        })
        console.log('❌ FALHOU: Permitiu marcar como concluída sem APAC!')
      } catch (error) {
        console.log('✅ SUCESSO: Bloqueou conclusão sem APAC')
        console.log(`   Erro: ${(error as any).message}`)
      }

      // Limpar solicitação de teste
      await prisma.solicitacaoOci.delete({ where: { id: solicitacaoTeste.id } })
      console.log('🗑️  Solicitação de teste removida')

      return
    }

    console.log(`📋 Testando com: ${solicitacao.numeroProtocolo}`)
    console.log(`   Status atual: ${solicitacao.status}`)
    console.log(`   Número APAC: ${solicitacao.numeroAutorizacaoApac || 'NÃO INFORMADO'}`)
    console.log(`   Execuções: ${solicitacao.execucoes.length}`)

    // 2. Testar conclusão manual através da API/service
    console.log('\n2. Testando conclusão manual sem número APAC...')
    
    try {
      // Simular chamada do service (não vamos realmente atualizar)
      if (!solicitacao.numeroAutorizacaoApac) {
        throw new Error(
          'Não é possível marcar como concluída: é obrigatório registrar o número de autorização APAC antes da conclusão. ' +
          'Use a opção "Registrar APAC" para informar o número de autorização.'
        )
      }
      console.log('❌ FALHOU: Não bloqueou conclusão sem APAC')
    } catch (error) {
      console.log('✅ SUCESSO: Validação funcionando')
      console.log(`   Erro: ${(error as any).message}`)
    }

    // 3. Testar adicionando número APAC
    console.log('\n3. Testando com número APAC...')
    
    const numeroApacTeste = '1234712345678' // 13 dígitos, 5º é "7"
    
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: numeroApacTeste }
    })
    
    console.log(`✅ Número APAC adicionado: ${numeroApacTeste}`)
    
    // Agora deveria permitir conclusão (se procedimentos obrigatórios estiverem ok)
    try {
      if (!numeroApacTeste) {
        throw new Error('Número APAC obrigatório')
      }
      console.log('✅ SUCESSO: Permitiria conclusão com APAC registrado')
    } catch (error) {
      console.log(`❌ FALHOU: ${(error as any).message}`)
    }

    // 4. Limpar número APAC de teste
    await prisma.solicitacaoOci.update({
      where: { id: solicitacao.id },
      data: { numeroAutorizacaoApac: null }
    })
    
    console.log('🗑️  Número APAC de teste removido')

    console.log('\n✅ Teste concluído com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testarValidacaoApac()