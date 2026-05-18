export function tokenQueryIdentity(token?: string | null) {
  if (!token) return 'anonymous';

  return `token:${token.slice(0, 8)}:${token.slice(-8)}`;
}
