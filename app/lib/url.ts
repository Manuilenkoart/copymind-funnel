export function withParams(
  href: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value.length > 0) {
      qs.set(key, value);
    }
  }
  const tail = qs.toString();
  if (!tail) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}${tail}`;
}
