/**
 * Gera número de protocolo único para solicitação OCI
 * Formato: OCI-YYYYMMDD-XXXXX (onde XXXXX é sequencial)
 */
export async function gerarNumeroProtocolo(prisma: any): Promise<string> {
  const hoje = new Date();
  const prefixo = `OCI-${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
  
  // Buscar último protocolo do dia
  const ultimaSolicitacao = await prisma.solicitacaoOci.findFirst({
    where: {
      numeroProtocolo: {
        startsWith: prefixo
      }
    },
    orderBy: {
      numeroProtocolo: 'desc'
    }
  });

  let sequencial = 1;
  if (ultimaSolicitacao) {
    const ultimoSequencial = parseInt(ultimaSolicitacao.numeroProtocolo.split('-')[2] || '0');
    sequencial = ultimoSequencial + 1;
  }

  return `${prefixo}-${String(sequencial).padStart(5, '0')}`;
}
