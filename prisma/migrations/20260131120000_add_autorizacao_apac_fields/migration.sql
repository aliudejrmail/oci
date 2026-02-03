-- AlterTable
ALTER TABLE "solicitacoes_oci" ADD COLUMN "numeroAutorizacaoApac" TEXT,
ADD COLUMN "nomeProfissionalAutorizador" TEXT,
ADD COLUMN "cnsProfissionalAutorizador" TEXT,
ADD COLUMN "dataAutorizacaoApac" TIMESTAMP(3);
