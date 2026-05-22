# UTM source tracking — per-event attribution

## Summary

Capture `utm_source` on every event in the funnel (`page_view`, `buy`). When
no `utm_source` is in the URL, default to `"Direct"`. Propagate all incoming
query parameters across internal navigation so the source — and any other
campaign params — survive the trip from the landing screen to the paywall.

First-touch / last-touch per-user attribution is a planned next step and is
explicitly out of scope here.

## Goals

- Every row in `events` carries a `utm_source` value.
- A user landing with `?utm_source=google` has `"google"` recorded on every
  event they generate during that visit, including the `buy` event.
- A user landing with no UTM param has `"Direct"` recorded.
- All incoming URL parameters (not only `utm_source`) are preserved across
  internal next/prev navigation, so future expansion (utm_medium, utm_campaign,
  gclid, fbclid, …) needs no further plumbing.

## Non-goals

- First-touch / last-touch attribution stored on `users`.
- Cookie-based persistence of `utm_source` across sessions or deep-link
  re-entry. A user opening a bookmark to `/funnel-1/2` with no query string
  records `"Direct"` from that point forward — accepted tradeoff for this
  iteration.
- Capturing or interpreting any UTM parameter other than `utm_source` (other
  params travel through the URL but are not read or stored).
- Validation, normalisation, or allow-listing of `utm_source` values. Whatever
  the URL says is what gets stored.

## Schema change

New migration `supabase/migrations/<timestamp>_add_utm_source_to_events.sql`:

```sql
alter table events add column utm_source text not null default 'Direct';
create index events_utm_source_idx on events(utm_source);
```

The `not null default 'Direct'` backfills existing rows and protects against
any future insert path that forgets the column.

## New helpers

### `app/lib/source.ts` — read `utm_source` from request searchParams

```ts
export function getUtmSource(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const raw = searchParams.utm_source;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'Direct';
}
```

Returns `"Direct"` whenever `utm_source` is missing, empty, or non-string.

### `app/lib/url.ts` — propagate all searchParams across internal links

```ts
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
```

Array-valued params (Next.js gives `string[]` for repeated keys) are dropped;
the funnel does not use them today.

## Touched files

| File | Change |
|---|---|
| `app/(public)/[funnelId]/page.tsx` | Accept `searchParams`, redirect via `withParams(/${funnelId}/0, sp)` |
| `app/(public)/[funnelId]/[screenIndex]/page.tsx` | Accept `searchParams`, build `nextHref` / `prevHref` via `withParams()`, pass `getUtmSource(sp)` to `recordEvent` |
| `app/(public)/[funnelId]/paywall/page.tsx` | Accept `searchParams`, pass `getUtmSource(sp)` to `recordEvent`, pass it as a prop to `BuyButton` |
| `app/(public)/[funnelId]/paywall/BuyButton.tsx` | Accept `utmSource` prop, forward to `recordBuyEvent(funnelId, utmSource)` |
| `app/actions/tracking.ts` `recordBuyEvent` | Accept `utmSource: string` param, forward to `recordEvent` |
| `app/lib/tracking.ts` `recordEvent` | Accept `utmSource: string`, include `utm_source` in the insert |
| `app/lib/source.ts` | New — `getUtmSource()` helper |
| `app/lib/url.ts` | New — `withParams()` helper |
| `supabase/migrations/<ts>_add_utm_source_to_events.sql` | New migration |

`app/(public)/[funnelId]/QuestionType/EmailForm.tsx` and `RowList.tsx` are
unchanged — they receive `nextHref` from the server parent, which already
carries the propagated query string.

`saveEmail` (in `app/actions/tracking.ts`) is unchanged — it updates user email
and inserts no event row.

## Flow

```
User clicks Google ad → /funnel-1?utm_source=google
  redirect → /funnel-1/0?utm_source=google
  page_view event: utm_source = "google"
  next link → /funnel-1/1?utm_source=google
  page_view event: utm_source = "google"
  ...
  /funnel-1/paywall?utm_source=google
  page_view event: utm_source = "google"
  Buy click → buy event: utm_source = "google"

User types URL directly → /funnel-1
  all events: utm_source = "Direct"
```

## Function signatures (final)

```ts
// app/lib/tracking.ts
export async function recordEvent(
  userId: string,
  funnelId: string,
  name: 'page_view' | 'buy',
  questionId: string | null,
  utmSource: string,
): Promise<void>;

// app/actions/tracking.ts
export async function recordBuyEvent(
  funnelId: string,
  utmSource: string,
): Promise<{ ok: boolean; error?: string }>;
```

`recordEvent`'s `questionId` parameter loses its default value because a
positional `utmSource` is added after it. All existing call sites already pass
a `questionId` explicitly, so the default was unused.

## Edge cases

- **Empty `utm_source=`** → treated as missing, recorded as `"Direct"`.
- **Whitespace-only `utm_source=%20%20`** → trimmed to empty, recorded as `"Direct"`.
- **User passes `utm_source=Direct`** → recorded as `"Direct"`. Indistinguishable
  from no UTM in analytics; accepted.
- **Very long `utm_source`** → stored verbatim. Postgres `text` has no length
  cap; no validation added in this iteration.
- **Bookmarked deep link to `/funnel-1/2`** → no query string, `utm_source`
  recorded as `"Direct"` for that and subsequent events in the session.
- **User shares a funnel URL containing their UTM** → the recipient inherits
  that `utm_source`. Acceptable for current attribution needs.

## Testing

- Unit: `getUtmSource` on `{ utm_source: 'google' }`, `{}`, `{ utm_source: '' }`,
  `{ utm_source: '  ' }`, `{ utm_source: ['a', 'b'] }`.
- Unit: `withParams` on empty params, single-key params, multi-key params,
  hrefs with and without existing `?`.
- Integration: hit `/funnel-1?utm_source=google`, walk the screens, click buy,
  assert every resulting `events` row has `utm_source = 'google'`.
- Integration: hit `/funnel-1` with no params, walk the screens, click buy,
  assert every row has `utm_source = 'Direct'`.
