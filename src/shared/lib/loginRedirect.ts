export function safeLoginRedirectTarget(value: string | null) {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.startsWith('/login')) return null;

  return value;
}

export function contestLoginPath(contestId: string, nextPath?: string) {
  const search = new URLSearchParams({
    reason: 'contest',
    contestId,
  });
  const safeNext = safeLoginRedirectTarget(nextPath ?? null);
  if (safeNext) search.set('moveTo', safeNext);

  return `/login?${search.toString()}`;
}

export function readLoginRedirectTarget(searchParams: URLSearchParams) {
  return (
    safeLoginRedirectTarget(searchParams.get('moveTo')) ??
    safeLoginRedirectTarget(searchParams.get('next'))
  );
}
