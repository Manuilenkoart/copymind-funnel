# UTM source tracking — manual smoke test (future e2e)

## Purpose

Verify end-to-end that the UTM source attribution feature
(spec: `2026-05-21-utm-source-tracking-design.md`) works in a real browser
against a real Supabase database. Until a Playwright/Cypress e2e harness
exists, this is run manually. Each scenario below is intended to become an
automated e2e test in a future iteration — keep the steps deterministic and
the assertions checkable from a single SQL query.

## Prerequisites

- Migration `supabase/migrations/20260521010000_add_utm_source_to_events.sql`
  applied to the target database (`supabase db push` or via the dashboard).
- Dev server running: `npm run dev` (default `http://localhost:3000`).
- A valid funnel id from `app/config/funnels.ts` — examples below use
  `quiz-1`; substitute whatever the local config exposes.
- Read access to the `events` table (SQL editor in the Supabase dashboard or
  any psql client).
- A fresh browser session per scenario: open a new private/incognito window
  or clear the `userId` cookie. Sharing the `userId` cookie between scenarios
  contaminates results because the same user keeps writing events.

## Reset between scenarios

Before each scenario, in the browser:

1. Close the previous tab.
2. Open a new private/incognito window (or in the same window, devtools →
   Application → Cookies → delete the `userId` cookie for `localhost:3000`).

Optionally, in SQL, capture a baseline of the latest `created_at` so the
"new events" query only returns this scenario's rows:

```sql
select max(created_at) from events;
```

Then in each scenario's verification query, filter
`where created_at > '<that timestamp>'`.

## Scenario 1 — Google-sourced visit

**Steps:**

1. Navigate to `http://localhost:3000/quiz-1?utm_source=google`.
2. On every screen, click the primary "next" / answer button.
3. On the email screen, submit any valid email (e.g. `smoke+1@test.com`).
4. On the paywall, click either Buy button.

**Expected URL behaviour:**

- Landing redirect lands on `/quiz-1/0?utm_source=google`.
- Every subsequent screen URL still contains `?utm_source=google` in the
  address bar.
- Paywall URL is `/quiz-1/paywall?utm_source=google`.

**Expected DB state (run in Supabase SQL editor):**

```sql
select question_id, name, utm_source, created_at
from events
order by created_at desc
limit 20;
```

Every row produced during this scenario MUST have `utm_source = 'google'`.
There should be one `page_view` row per screen + one `page_view` for
`paywall` + one `buy` row.

## Scenario 2 — Direct visit (no UTM)

**Steps:**

1. Reset browser (see "Reset between scenarios").
2. Navigate to `http://localhost:3000/quiz-1` — no query string.
3. Walk the entire funnel and click Buy.

**Expected URL behaviour:**

- URLs contain no `?utm_source=` anywhere.

**Expected DB state:**

```sql
select question_id, name, utm_source, created_at
from events
order by created_at desc
limit 20;
```

Every row produced during this scenario MUST have `utm_source = 'Direct'`.

## Scenario 3 — Multi-parameter visit (Facebook + cpc + gclid)

**Steps:**

1. Reset browser.
2. Navigate to
   `http://localhost:3000/quiz-1?utm_source=facebook&utm_medium=cpc&gclid=xyz`.
3. Walk the entire funnel and click Buy.

**Expected URL behaviour:**

- On every screen, the URL bar retains **all three** params:
  `utm_source=facebook`, `utm_medium=cpc`, `gclid=xyz`.
- Order of params in the URL is not asserted — only presence.

**Expected DB state:**

```sql
select question_id, name, utm_source, created_at
from events
order by created_at desc
limit 20;
```

Every row produced during this scenario MUST have
`utm_source = 'facebook'`. The other parameters (`utm_medium`, `gclid`)
travel through the URL but are intentionally **not** stored — verified by
the absence of any other UTM column.

## Scenario 4 — Edge: empty utm_source

**Steps:**

1. Reset browser.
2. Navigate to `http://localhost:3000/quiz-1?utm_source=`.
3. Walk the funnel and click Buy.

**Expected:**

- URL retains the empty `utm_source=` across screens (the helper drops
  empty values when building hrefs, so the param may disappear after the
  first navigation — both behaviours are acceptable).
- Every event row in this session has `utm_source = 'Direct'`.

## Scenario 5 — Edge: deep link without UTM after a Google entry

**Steps:**

1. Reset browser.
2. Visit `http://localhost:3000/quiz-1?utm_source=google` and walk to
   screen 1.
3. In a different tab (same browser session, same `userId` cookie), open
   `http://localhost:3000/quiz-1/2` — a deep link with no UTM.
4. Walk from screen 2 to the paywall and click Buy.

**Expected:**

- Events from screens 0 and 1 (first tab) have `utm_source = 'google'`.
- Events from screens 2, 3, paywall, and buy (second tab) have
  `utm_source = 'Direct'`.

This documents the accepted tradeoff in the design spec: source is
URL-driven per request, not cookie-persisted.

## Future e2e implementation notes

When converting these scenarios to Playwright / Cypress / similar:

- Each scenario maps cleanly to one test case; the "reset" step becomes
  `beforeEach` cookie clear.
- URL assertions should use a `URL` parser, not string contains, to avoid
  false positives.
- DB assertions should query the events table directly via the Supabase
  client using a per-test user id (set the `userId` cookie deterministically
  at test start rather than relying on the proxy to generate one).
- A teardown step should delete events for the test user id to keep the DB
  clean between runs.
- Run the migration against an isolated Supabase branch / local stack
  before each suite run.
