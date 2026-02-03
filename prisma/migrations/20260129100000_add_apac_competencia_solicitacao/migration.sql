-- AlterTable: APAC - validade 2 competências e datas de início/encerramento (Portaria SAES 1640/2024, 1821/2024)
ALTER TABLE "solicitacoes_oci" ADD COLUMN "competenciaInicioApac" TEXT;
ALTER TABLE "solicitacoes_oci" ADD COLUMN "competenciaFimApac" TEXT;
ALTER TABLE "solicitacoes_oci" ADD COLUMN "dataInicioValidadeApac" TIMESTAMP(3);
ALTER TABLE "solicitacoes_oci" ADD COLUMN "dataEncerramentoApac" TIMESTAMP(3);
