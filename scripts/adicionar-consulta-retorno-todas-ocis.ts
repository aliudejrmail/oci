import { prisma } from '../src/database/prisma';

const nomeProcedimento = 'CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA - RETORNO';
const codigoProcedimento = 'OCI-RETORNO-01';

async function main() {
  const ocis = await prisma.oci.findMany();
  let totalIncluidos = 0;
  for (const oci of ocis) {
    const existente = await prisma.procedimentoOci.findFirst({
      where: {
        ociId: oci.id,
        nome: nomeProcedimento
      }
    });
    if (existente) {
      console.log(`✅ Já existe em ${oci.codigo} - ${oci.nome}`);
      continue;
    }
    await prisma.procedimentoOci.create({
      data: {
        ociId: oci.id,
        codigo: codigoProcedimento,
        codigoSigtap: null,
        nome: nomeProcedimento,
        tipo: 'CONSULTA',
        ordem: 99,
        obrigatorio: false
      }
    });
    console.log(`➕ Adicionado em ${oci.codigo} - ${oci.nome}`);
    totalIncluidos++;
  }
  console.log(`\nTotal de OCIs atualizadas: ${totalIncluidos}`);
}

main().finally(() => prisma.$disconnect());
