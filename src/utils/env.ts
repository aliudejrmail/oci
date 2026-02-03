/**
 * Retorna o JWT_SECRET. Em produção exige que esteja configurado.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return secret;
  }
  return secret || 'secret';
}
