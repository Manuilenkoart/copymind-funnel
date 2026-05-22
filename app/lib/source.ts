export function getUtmSource(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const raw = searchParams.utm_source;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'Direct';
}
