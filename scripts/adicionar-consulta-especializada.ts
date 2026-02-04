/**
 * Script para adicionar consulta médica especializada à OCI de oncologia.
 */

import { PrismaClient } from '@prisma/client'

async function adicionarConsultaEspecializada(): Promise<void> {
  const prisma = new PrismaClient()
  
  try {
    const oci = await prisma.oci.findFirst({
      where: { codigo: '090101' }
    })

    if (!oci) {
      console.log('❌ OCI 090101 não encontrada.')
      return
    }

    const consultaExistente = await prisma.procedimentoOci.findFirst({
      where: {
        ociId: oci.id,
        nome: { contains: 'CONSULTA', mode: 'insensitive' }
      }
    })

    if (consultaExistente) {
      console.log('✅ Consulta especializada já existe na OCI.')
      return
    }

    await prisma.procedimentoOci.create({
      data: {
        ociId: oci.id,
        codigo: '03.01.01.007-2',
        codigoSigtap: '03.01.01.007-2',
        nome: 'CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA',
        tipo: 'CONSULTA',
        ordem: 1,
        obrigatorio: true
      }
    })

    console.log('✅ Consulta médica especializada adicionada à OCI!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  adicionarConsultaEspecializada()
}