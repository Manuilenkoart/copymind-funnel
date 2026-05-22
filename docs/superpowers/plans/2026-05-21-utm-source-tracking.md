# UTM Source Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stamp every `events` row with the visitor's `utm_source` (defaulting to `"Direct"`) and preserve all incoming URL params across internal funnel navigation.

**Architecture:** Add a `utm_source` text column (default `"Direct"`) on `events`. Read `utm_source` from the request's `searchParams` in each server page, pass it into `recordEvent`. Propagate the full incoming search-params object onto every internal `next` / `prev` href via a `withParams()` helper.

**Tech Stack:** Next.js 16 (App Router server components), TypeScript, Supabase Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-21-utm-source-tracking-design.md`

---

## Task 1: Migration — add `utm_source` to `events`

**Files:**
- Create: `supabase/migrations/20260521010000_add_utm_source_to_events.sql`

- [ ] **Step 1: Write the migration**

```sql
alter table events add column utm_source text not null default 'Direct';
create index events_utm_source_idx on events(utm_source);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260521010000_add_utm_source_to_events.sql
git commit -m "feat(db): add utm_source column to events"
```

---

## Task 2: `getUtmSource` helper

**Files:**
- Create: `app/lib/source.ts`
- Test: `__tests__/source.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/source.test.ts
import { describe, expect, it } from 'vitest';

import { getUtmSource } from '@/app/lib/source';

describe('getUtmSource', () => {
  it('returns the utm_source when present', () => {
    expect(getUtmSource({ utm_source: 'google' })).toBe('google');
  });

  it('returns "Direct" when utm_source is missing', () => {
    expect(getUtmSource({})).toBe('Direct');
  });

  it('returns "Direct" when utm_source is an empty string', () => {
    expect(getUtmSource({ utm_source: '' })).toBe('Direct');
  });

  it('returns "Direct" when utm_source is whitespace only', () => {
    expect(getUtmSource({ utm_source: '   ' })).toBe('Direct');
  });

  it('trims whitespace around a real value', () => {
    expect(getUtmSource({ utm_source: '  facebook  ' })).toBe('facebook');
  });

  it('returns "Direct" when utm_source is an array (Next.js repeated key)', () => {
    expect(getUtmSource({ utm_source: ['a', 'b'] })).toBe('Direct');
  });

  it('ignores unrelated keys', () => {
    expect(getUtmSource({ utm_medium: 'cpc', gclid: 'abc' })).toBe('Direct');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- source.test`
Expected: FAIL — cannot find module `@/app/lib/source`.

- [ ] **Step 3: Implement `getUtmSource`**

```ts
// app/lib/source.ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- source.test`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add app/lib/source.ts __tests__/source.test.ts
git commit -m "feat: add getUtmSource helper"
```

---

## Task 3: `withParams` helper

**Files:**
- Create: `app/lib/url.ts`
- Test: `__tests__/url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/url.test.ts
import { describe, expect, it } from 'vitest';

import { withParams } from '@/app/lib/url';

describe('withParams', () => {
  it('returns href unchanged when params are empty', () => {
    expect(withParams('/funnel-1/0', {})).toBe('/funnel-1/0');
  });

  it('appends a single query param with a leading ?', () => {
    expect(withParams('/funnel-1/0', { utm_source: 'google' })).toBe(
      '/funnel-1/0?utm_source=google'
    );
  });

  it('appends multiple query params', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: 'cpc' })
    ).toBe('/funnel-1/0?utm_source=google&utm_medium=cpc');
  });

  it('uses & when the href already has a query string', () => {
    expect(withParams('/funnel-1/0?foo=bar', { utm_source: 'google' })).toBe(
      '/funnel-1/0?foo=bar&utm_source=google'
    );
  });

  it('skips empty-string values', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: '' })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('skips undefined values', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: undefined })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('drops array-valued params', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', tags: ['a', 'b'] })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('URL-encodes special characters in values', () => {
    expect(withParams('/funnel-1/0', { utm_source: 'a b&c' })).toBe(
      '/funnel-1/0?utm_source=a+b%26c'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- url.test`
Expected: FAIL — cannot find module `@/app/lib/url`.

- [ ] **Step 3: Implement `withParams`**

```ts
// app/lib/url.ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- url.test`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add app/lib/url.ts __tests__/url.test.ts
git commit -m "feat: add withParams helper for query-string propagation"
```

---

## Task 4: Extend `recordEvent` to accept and persist `utm_source`

**Files:**
- Modify: `app/lib/tracking.ts`
- Modify: `__tests__/tracking.test.ts`

- [ ] **Step 1: Update existing tests to require `utm_source`**

Replace the contents of `__tests__/tracking.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEq, mockInsert, mockUpsert, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({
    upsert: mockUpsert,
    insert: mockInsert,
    update: mockUpdate,
  }));
  return { mockEq, mockInsert, mockUpsert, mockUpdate, mockFrom };
});

vi.mock('@/app/lib/supabase/server', () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

import { recordEvent, updateUserEmail } from '@/app/lib/tracking';

describe('recordEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the user row', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'google');
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'user-abc' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  });

  it('inserts a page_view event with utm_source', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'google');
    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'page_view',
      funnel_id: 'quiz-1',
      question_id: '0',
      user_id: 'user-abc',
      utm_source: 'google',
    });
  });

  it('records "Direct" when caller passes "Direct"', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'Direct');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: 'Direct' })
    );
  });

  it('records paywall as question_id "paywall"', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', 'paywall', 'google');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_id: 'paywall' })
    );
  });

  it('records a buy event with utm_source', async () => {
    await recordEvent('user-abc', 'quiz-1', 'buy', 'paywall', 'facebook');
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'buy',
      funnel_id: 'quiz-1',
      question_id: 'paywall',
      user_id: 'user-abc',
      utm_source: 'facebook',
    });
  });
});

describe('updateUserEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates email on the users table filtered by id', async () => {
    await updateUserEmail('user-abc', 'test@example.com');
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockUpdate).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-abc');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tracking.test`
Expected: FAIL — current `recordEvent` ignores the new arg and inserts no `utm_source`.

- [ ] **Step 3: Update `recordEvent`**

Replace `app/lib/tracking.ts` with:

```ts
import { createServerClient } from './supabase/server';

export async function recordEvent(
  userId: string,
  funnelId: string,
  name: 'page_view' | 'buy',
  questionId: string | null,
  utmSource: string
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from('users')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  await supabase.from('events').insert({
    name,
    funnel_id: funnelId,
    question_id: questionId,
    user_id: userId,
    utm_source: utmSource,
  });
}

export async function updateUserEmail(
  userId: string,
  email: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('users').update({ email }).eq('id', userId);
  if (error) throw error;
}
```

Note: `questionId` is no longer optional (no `= null` default) because a required `utmSource` follows it. All existing callers pass `questionId` explicitly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tracking.test`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add app/lib/tracking.ts __tests__/tracking.test.ts
git commit -m "feat: persist utm_source on every event"
```

---

## Task 5: Forward `utm_source` through the `recordBuyEvent` server action

**Files:**
- Modify: `app/actions/tracking.ts`

- [ ] **Step 1: Update `recordBuyEvent` to accept `utmSource`**

Replace `app/actions/tracking.ts` with:

```ts
'use server';

import { cookies } from 'next/headers';

import { recordEvent, updateUserEmail } from '@/app/lib/tracking';
import { EMAIL_REGEX } from '@/app/lib/validation';

export async function saveEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!email || !EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Invalid email' };
  }
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return { ok: false, error: 'No user session' };
  try {
    await updateUserEmail(userId, email);
    return { ok: true };
  } catch (err) {
    console.error('[tracking] saveEmail failed:', err);
    return { ok: false, error: 'Failed to save email' };
  }
}

export async function recordBuyEvent(
  funnelId: string,
  utmSource: string
): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return { ok: false, error: 'No user session' };
  try {
    await recordEvent(userId, funnelId, 'buy', 'paywall', utmSource);
    return { ok: true };
  } catch (err) {
    console.error('[tracking] recordBuyEvent failed:', err);
    return { ok: false, error: 'Failed to record buy event' };
  }
}
```

- [ ] **Step 2: Verify it builds**

Run: `npx tsc --noEmit`
Expected: PASS (errors will appear in `BuyButton.tsx` and the paywall page — those are fixed in the next tasks).

Note: it's normal to see "Expected 2 arguments, but got 1" in `BuyButton.tsx` at this point. Don't commit until Task 6 fixes it.

- [ ] **Step 3: Update `BuyButton.tsx` and the paywall page (covered in Tasks 6 & 8) before committing**

Hold the commit until the call sites compile.

---

## Task 6: `BuyButton` accepts and forwards `utmSource`

**Files:**
- Modify: `app/(public)/[funnelId]/paywall/BuyButton.tsx`

- [ ] **Step 1: Update `BuyButton`**

Replace `app/(public)/[funnelId]/paywall/BuyButton.tsx` with:

```tsx
'use client';

import { useState } from 'react';

import { recordBuyEvent } from '@/app/actions/tracking';

interface BuyButtonProps {
  funnelId: string;
  utmSource: string;
  className?: string;
  children: React.ReactNode;
}

export default function BuyButton({ funnelId, utmSource, className, children }: BuyButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await recordBuyEvent(funnelId, utmSource);
    setIsSubmitting(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className={className}
      >
        {children}
      </button>
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl border border-emerald-400/40"
        >
          Success buy
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Defer commit**

Hold until paywall page is updated in Task 8.

---

## Task 7: Landing redirect propagates query params

**Files:**
- Modify: `app/(public)/[funnelId]/page.tsx`

- [ ] **Step 1: Update the landing redirect**

Replace `app/(public)/[funnelId]/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';

import { withParams } from '@/app/lib/url';

export default async function FunnelLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { funnelId } = await params;
  const sp = await searchParams;
  redirect(withParams(`/${funnelId}/0`, sp));
}
```

- [ ] **Step 2: Defer commit**

Hold until all server pages are updated.

---

## Task 8: Screen page reads `utm_source` and propagates params

**Files:**
- Modify: `app/(public)/[funnelId]/[screenIndex]/page.tsx`

- [ ] **Step 1: Update the screen page**

Replace `app/(public)/[funnelId]/[screenIndex]/page.tsx` with:

```tsx
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { funnelsConfig } from '@/app/config/funnels';
import { getUtmSource } from '@/app/lib/source';
import { recordEvent } from '@/app/lib/tracking';
import { withParams } from '@/app/lib/url';

import ScreenRenderer from '../QuestionType/ScreenRenderer';

export default async function FunnelScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelId: string; screenIndex: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { funnelId, screenIndex: screenIndexStr } = await params;
  const sp = await searchParams;
  const config = funnelsConfig[funnelId as keyof typeof funnelsConfig];

  if (!config) notFound();

  const screenIndex = parseInt(screenIndexStr, 10);
  if (isNaN(screenIndex) || screenIndex < 0 || screenIndex >= config.screens.length) {
    notFound();
  }

  const utmSource = getUtmSource(sp);

  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (userId) {
    try {
      await recordEvent(userId, funnelId, 'page_view', screenIndexStr, utmSource);
    } catch (err) {
      console.error('[tracking] recordPageView failed:', err);
    }
  }

  const screen = config.screens[screenIndex];
  const nextHref = withParams(
    screenIndex + 1 < config.screens.length
      ? `/${funnelId}/${screenIndex + 1}`
      : `/${funnelId}/paywall`,
    sp
  );
  const prevHref =
    screenIndex > 0 ? withParams(`/${funnelId}/${screenIndex - 1}`, sp) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10">
        <ScreenRenderer screen={screen} nextHref={nextHref} prevHref={prevHref} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Defer commit**

Hold until paywall page is updated.

---

## Task 9: Paywall page reads `utm_source` and feeds `BuyButton`

**Files:**
- Modify: `app/(public)/[funnelId]/paywall/page.tsx`

- [ ] **Step 1: Update the paywall page**

Replace `app/(public)/[funnelId]/paywall/page.tsx` with:

```tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { funnelsConfig } from "@/app/config/funnels";
import { getUtmSource } from "@/app/lib/source";
import { recordEvent } from "@/app/lib/tracking";

import BuyButton from "./BuyButton";

export default async function FunnelPaywallPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { funnelId } = await params;
  const sp = await searchParams;
  const config = funnelsConfig[funnelId as keyof typeof funnelsConfig];

  if (!config) notFound();

  const utmSource = getUtmSource(sp);

  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (userId) {
    try {
      await recordEvent(userId, funnelId, "page_view", "paywall", utmSource);
    } catch (err) {
      console.error("[tracking] recordPageView failed:", err);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans">
      <div className="w-full max-w-lg p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Final Step: Unlock Access
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
          Choose Your Plan
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Get lifetime access to the private dashboard and all custom premium
          tools.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative p-6 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/50 hover:bg-white/10 transition-all duration-200 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold">Standard Plan</h3>
              <p className="mt-1 text-xs text-slate-400">
                Basic features &amp; setup
              </p>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold">$19</span>
                <span className="ml-1 text-sm text-slate-400">/one-time</span>
              </div>
            </div>
            <BuyButton
              funnelId={funnelId}
              utmSource={utmSource}
              className="mt-6 block w-full py-2.5 text-center rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Buy
            </BuyButton>
          </div>

          <div className="relative p-6 rounded-xl bg-indigo-600/20 border-2 border-indigo-500 hover:bg-indigo-600/30 transition-all duration-200 flex flex-col justify-between shadow-lg shadow-indigo-500/10">
            <span className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-indigo-500 text-[10px] font-bold uppercase tracking-wider">
              Popular
            </span>
            <div>
              <h3 className="text-lg font-bold">Premium Plan</h3>
              <p className="mt-1 text-xs text-indigo-200">
                Full access &amp; updates
              </p>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold">$49</span>
                <span className="ml-1 text-sm text-indigo-200">/one-time</span>
              </div>
            </div>
            <BuyButton
              funnelId={funnelId}
              utmSource={utmSource}
              className="mt-6 block w-full py-2.5 text-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-all duration-200 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Buy
            </BuyButton>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            30-day money back guarantee. Safe &amp; secure payment.
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run full typecheck & tests**

```bash
npx tsc --noEmit
npm run lint
npm test
```

Expected: all green.

- [ ] **Step 3: Commit all server-side wiring together**

```bash
git add \
  app/actions/tracking.ts \
  app/\(public\)/\[funnelId\]/page.tsx \
  app/\(public\)/\[funnelId\]/\[screenIndex\]/page.tsx \
  app/\(public\)/\[funnelId\]/paywall/page.tsx \
  app/\(public\)/\[funnelId\]/paywall/BuyButton.tsx
git commit -m "feat: read utm_source from URL and propagate across funnel"
```

---

## Task 10: Manual smoke test

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk a Google-sourced flow**

1. Open `http://localhost:3000/quiz-1?utm_source=google` (use any real funnelId from `app/config/funnels.ts`).
2. Click through every screen, confirming the URL bar retains `?utm_source=google` on every step.
3. Click Buy on the paywall.
4. In Supabase, run `select question_id, name, utm_source from events order by created_at desc limit 10;`.
5. Expected: every row from this session has `utm_source = 'google'`.

- [ ] **Step 3: Walk a direct (no UTM) flow**

1. Open `http://localhost:3000/quiz-1` (no query string), use a fresh browser profile or clear the `userId` cookie first.
2. Click through every screen and Buy.
3. Re-run the SQL query.
4. Expected: every row from this session has `utm_source = 'Direct'`.

- [ ] **Step 4: Walk a multi-param flow**

1. Open `http://localhost:3000/quiz-1?utm_source=facebook&utm_medium=cpc&gclid=xyz`.
2. Confirm the URL bar retains **all three** params on every internal navigation.
3. Expected: `events.utm_source = 'facebook'` for every row. The other params travel through the URL but are not stored (spec).

---

## Self-Review

**Spec coverage:**
- Schema change → Task 1 ✓
- `getUtmSource` helper → Task 2 ✓
- `withParams` helper → Task 3 ✓
- `recordEvent` accepts/persists `utm_source` → Task 4 ✓
- `recordBuyEvent` accepts `utm_source` → Task 5 ✓
- `BuyButton` forwards `utm_source` → Task 6 ✓
- Landing redirect propagates params → Task 7 ✓
- Screen page reads UTM, propagates params, passes to `recordEvent` → Task 8 ✓
- Paywall page reads UTM, passes to `recordEvent` and `BuyButton` → Task 9 ✓
- Edge cases (empty, whitespace, array, `Direct`) → Task 2 unit tests + Task 10 manual smoke ✓

**Placeholder scan:** none.

**Type consistency:** `utmSource` (camelCase) in TS code, `utm_source` (snake_case) in DB columns and URL params. `recordEvent` signature `(userId, funnelId, name, questionId, utmSource)` matches all call sites in Tasks 4, 5, 8, 9.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-21-utm-source-tracking.md`.
