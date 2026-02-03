-- AlterTable: adiciona justificativaCancelamento em solicitacoes_oci (obrigatório ao cancelar)
ALTER TABLE "solicitacoes_oci" ADD COLUMN "justificativaCancelamento" TEXT;
