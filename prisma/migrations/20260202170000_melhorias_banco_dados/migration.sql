-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'GESTOR', 'ATENDENTE', 'EXECUTANTE', 'AUTORIZADOR', 'SOLICITANTE');

-- AlterTable usuarios: alter tipo column to use enum
ALTER TABLE "usuarios" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "tipo" TYPE "TipoUsuario" USING ("tipo"::text::"TipoUsuario");

-- AlterTable solicitacoes_oci: add new columns
ALTER TABLE "solicitacoes_oci" ADD COLUMN "unidadeOrigemId" TEXT;
ALTER TABLE "solicitacoes_oci" ADD COLUMN "unidadeDestinoId" TEXT;
ALTER TABLE "solicitacoes_oci" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable execucoes_procedimentos: add unidadeExecutoraId
ALTER TABLE "execucoes_procedimentos" ADD COLUMN "unidadeExecutoraId" TEXT;

-- CreateIndex
CREATE INDEX "solicitacoes_oci_status_dataSolicitacao_idx" ON "solicitacoes_oci"("status", "dataSolicitacao" DESC);
CREATE INDEX "solicitacoes_oci_tipo_status_idx" ON "solicitacoes_oci"("tipo", "status");
CREATE INDEX "solicitacoes_oci_unidadeOrigem_idx" ON "solicitacoes_oci"("unidadeOrigem");
CREATE INDEX "solicitacoes_oci_competenciaFimApac_idx" ON "solicitacoes_oci"("competenciaFimApac");
CREATE INDEX "solicitacoes_oci_deletedAt_idx" ON "solicitacoes_oci"("deletedAt");
CREATE INDEX "execucoes_procedimentos_unidadeExecutora_idx" ON "execucoes_procedimentos"("unidadeExecutora");
CREATE INDEX "execucoes_procedimentos_solicitacaoId_status_idx" ON "execucoes_procedimentos"("solicitacaoId", "status");

-- Remove duplicate procedimentos_oci (ociId, codigo) before adding unique constraint
DELETE FROM "procedimentos_oci" a
USING "procedimentos_oci" b
WHERE a.id > b.id AND a."ociId" = b."ociId" AND a.codigo = b.codigo;

-- CreateTable unique constraint procedimentos_oci (ociId, codigo)
CREATE UNIQUE INDEX "procedimentos_oci_ociId_codigo_key" ON "procedimentos_oci"("ociId", "codigo");

-- AddForeignKey
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_unidadeOrigemId_fkey" FOREIGN KEY ("unidadeOrigemId") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_unidadeDestinoId_fkey" FOREIGN KEY ("unidadeDestinoId") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "execucoes_procedimentos" ADD CONSTRAINT "execucoes_procedimentos_unidadeExecutoraId_fkey" FOREIGN KEY ("unidadeExecutoraId") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
