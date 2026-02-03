-- CreateTable
CREATE TABLE "anexos_solicitacoes" (
    "id" TEXT NOT NULL,
    "solicitacaoOciId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "caminhoArmazenado" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamanhoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anexos_solicitacoes_solicitacaoOciId_idx" ON "anexos_solicitacoes"("solicitacaoOciId");

-- AddForeignKey
ALTER TABLE "anexos_solicitacoes" ADD CONSTRAINT "anexos_solicitacoes_solicitacaoOciId_fkey" FOREIGN KEY ("solicitacaoOciId") REFERENCES "solicitacoes_oci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
