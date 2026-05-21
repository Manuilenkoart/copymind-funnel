# Screen-per-route design

## Goal

Replace the current all-screens-on-one-page layout with `/{funnelId}/[screenIndex]` routing, so each `config.screens` entry is a distinct URL. Wire up forward and backward navigation so a future nav bar can be added without further plumbing changes.

## Route structure

```
app/(public)/[funnelId]/
  page.tsx                       redirect → /{funnelId}/0
  [screenIndex]/
    page.tsx                     NEW — server component, renders one screen
  QuestionType/
    ScreenRenderer.tsx           add email branch; accept nextHref + prevHref
    RowList.tsx                  replace hardcoded /email href with nextHref prop; drop funnelId prop
    EmailForm.tsx                NEW — extracted from email/page.tsx
  email/
    page.tsx                     DELETED
  paywall/
    page.tsx                     unchanged
```

## Data flow

`[screenIndex]/page.tsx` (server component):

1. Awaits `params`, extracts `funnelId` and `screenIndex`.
2. Looks up `funnelsConfig[funnelId]` — calls `notFound()` if missing.
3. Parses `screenIndex` as integer — calls `notFound()` if `NaN` or out of bounds.
4. Computes navigation:
   - `nextHref`: `/${funnelId}/${screenIndex + 1}` if another screen follows, else `/${funnelId}/paywall`.
   - `prevHref`: `/${funnelId}/${screenIndex - 1}` if `screenIndex > 0`, else `null`.
5. Renders `<ScreenRenderer screen={screens[screenIndex]} funnelId={funnelId} nextHref={nextHref} prevHref={prevHref} />`.

## Component changes

**`ScreenRenderer`**
- Add `nextHref: string` and `prevHref: string | null` to props.
- Add `QuestionType.email` branch that renders `<EmailForm screen={screen} nextHref={nextHref} />`.
- Pass `nextHref` to `<RowList>`.
- `prevHref` is accepted and threaded through but not yet rendered (placeholder for the future nav bar).

**`RowList`**
- Replace `href={/${funnelId}/email}` with `href={nextHref}`.
- Remove `funnelId` prop (no longer needed).

**`EmailForm`** (new `"use client"` component)
- Props: `{ screen: EmailQuestionConfig, nextHref: string }`.
- Same form logic as the current `email/page.tsx`: `useState` for email + error, validates with regex, calls `router.push(nextHref)` on success.
- `email/page.tsx` is deleted after extraction.

## Out of scope

- Visual nav bar UI (future task; plumbing is in place via `prevHref`).
- Persisting answers across screens (not in scope for this change).
- Paywall page changes.
