-- CreateEnum
CREATE TYPE "TipoOci" AS ENUM ('GERAL', 'ONCOLOGICO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "TipoProcedimento" AS ENUM ('CONSULTA', 'EXAME', 'PROCEDIMENTO_CIRURGICO', 'TECNOLOGIA', 'OUTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocis" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoOci" NOT NULL,
    "prazoMaximoDias" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimentos_oci" (
    "id" TEXT NOT NULL,
    "ociId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoSigtap" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoProcedimento" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedimentos_oci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_oci" (
    "id" TEXT NOT NULL,
    "numeroProtocolo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "ociId" TEXT NOT NULL,
    "tipo" "TipoOci" NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrazo" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "unidadeOrigem" TEXT NOT NULL,
    "unidadeDestino" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "atualizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_oci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes_procedimentos" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "procedimentoId" TEXT NOT NULL,
    "dataAgendamento" TIMESTAMP(3),
    "dataExecucao" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "observacoes" TEXT,
    "profissional" TEXT,
    "unidadeExecutora" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execucoes_procedimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_prazos" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "diasRestantes" INTEGER NOT NULL,
    "nivelAlerta" TEXT NOT NULL,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "dataNotificacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertas_prazos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cpf_key" ON "pacientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "ocis_codigo_key" ON "ocis"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_oci_numeroProtocolo_key" ON "solicitacoes_oci"("numeroProtocolo");

-- CreateIndex
CREATE INDEX "solicitacoes_oci_status_idx" ON "solicitacoes_oci"("status");

-- CreateIndex
CREATE INDEX "solicitacoes_oci_dataPrazo_idx" ON "solicitacoes_oci"("dataPrazo");

-- CreateIndex
CREATE INDEX "solicitacoes_oci_dataSolicitacao_idx" ON "solicitacoes_oci"("dataSolicitacao");

-- CreateIndex
CREATE INDEX "execucoes_procedimentos_solicitacaoId_idx" ON "execucoes_procedimentos"("solicitacaoId");

-- CreateIndex
CREATE INDEX "execucoes_procedimentos_status_idx" ON "execucoes_procedimentos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_prazos_solicitacaoId_key" ON "alertas_prazos"("solicitacaoId");

-- CreateIndex
CREATE INDEX "alertas_prazos_nivelAlerta_idx" ON "alertas_prazos"("nivelAlerta");

-- CreateIndex
CREATE INDEX "alertas_prazos_notificado_idx" ON "alertas_prazos"("notificado");

-- AddForeignKey
ALTER TABLE "procedimentos_oci" ADD CONSTRAINT "procedimentos_oci_ociId_fkey" FOREIGN KEY ("ociId") REFERENCES "ocis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_ociId_fkey" FOREIGN KEY ("ociId") REFERENCES "ocis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_oci" ADD CONSTRAINT "solicitacoes_oci_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_procedimentos" ADD CONSTRAINT "execucoes_procedimentos_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_oci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_procedimentos" ADD CONSTRAINT "execucoes_procedimentos_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "procedimentos_oci"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_prazos" ADD CONSTRAINT "alertas_prazos_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_oci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: compatibilidade procedimento OCI × CID (SIGTAP rl_procedimento_cid)
CREATE TABLE "compatibilidade_cid" (
    "id" TEXT NOT NULL,
    "procedimentoOciId" TEXT NOT NULL,
    "cidCodigo" TEXT NOT NULL,
    "cidDescricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compatibilidade_cid_pkey" PRIMARY KEY ("id")
);

-- CreateTable: compatibilidade procedimento OCI × CBO (SIGTAP rl_procedimento_cbo)
CREATE TABLE "compatibilidade_cbo" (
    "id" TEXT NOT NULL,
    "procedimentoOciId" TEXT NOT NULL,
    "cboCodigo" TEXT NOT NULL,
    "cboDescricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compatibilidade_cbo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compatibilidade_cid_procedimentoOciId_cidCodigo_key" ON "compatibilidade_cid"("procedimentoOciId", "cidCodigo");
CREATE INDEX "compatibilidade_cid_cidCodigo_idx" ON "compatibilidade_cid"("cidCodigo");
CREATE UNIQUE INDEX "compatibilidade_cbo_procedimentoOciId_cboCodigo_key" ON "compatibilidade_cbo"("procedimentoOciId", "cboCodigo");
CREATE INDEX "compatibilidade_cbo_cboCodigo_idx" ON "compatibilidade_cbo"("cboCodigo");

ALTER TABLE "compatibilidade_cid" ADD CONSTRAINT "compatibilidade_cid_procedimentoOciId_fkey" FOREIGN KEY ("procedimentoOciId") REFERENCES "procedimentos_oci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compatibilidade_cbo" ADD CONSTRAINT "compatibilidade_cbo_procedimentoOciId_fkey" FOREIGN KEY ("procedimentoOciId") REFERENCES "procedimentos_oci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
