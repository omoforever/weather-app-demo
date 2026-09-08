# PROGRESS.md

Running log, newest at top. One entry per session or meaningful chunk of work — not per commit.

## Current state

Scaffold and `/api/weather` are done and verified against the live Visual Crossing API (45 tests green, lint and typecheck clean, pushed to `origin/main`). No UI beyond a placeholder page — next ticket is `SearchInput`.

---

## [2026-09-09]

**Did:** Verified `/api/weather` against the live API with a real key. All four status paths behave (200 London, 404 unknown location, 400 missing and blank input) and no key appears in any response body. Live testing caught two bugs in the ±24h window, both now fixed with regression tests:

1. **Upstream day-rounding clipped the window.** Visual Crossing rounds a unix-second range to whole calendar days in the location's timezone, inconsistently — two identical requests 20 minutes apart returned different first hours, one missing an hour the window needed. Fixed by padding the request a day either side and trimming locally.
2. **Hour-boundary truncation.** A strict `now ± 24h` filter dropped the reading at the edge when `now` wasn't on the hour, yielding ~23h of past data. `toHourlyWindow` now floors/ceils the bounds to whole hours, so expect 49-50 readings.

Re-verified across London, Auckland (UTC+12) and New York — all return a complete ±24h window.

**Decisions:**
- `elements=` trimming is safe — it keeps `resolvedAddress` and `timezone` while cutting the payload from 36KB to ~10KB. This was the open question from last session; answered, no change needed.
- The padding costs quota: each lookup now spans 5 calendar days ≈ 120 records of the free tier's 1000/day (~8 lookups/day). Accepted as the price of a complete window; makes the planned client-side cache mandatory rather than nice-to-have.
- `resolvedAddress` echoes simple input verbatim ("London") and only enriches ambiguous input ("New York, NY" → "New York, NY, United States"), so the UI can't assume it's more specific than the query.

**Next:** `SearchInput` ticket. Watch the request quota while building the UI — prefer mocked data over live calls.

---

## [2026-09-08] — session 2

**Did:** Scaffolded Next.js 16 + TypeScript (no `src/`), wired MUI v9 + emotion + Motion v12 behind `AppRouterCacheProvider` + a Sift-flavoured theme (`theme.ts`), set up Vitest + RTL + jsdom. Built the weather endpoint as three `lib/` modules (`visualCrossing.ts` fetch, `shapeWeather.ts` pure transform, `weatherErrors.ts` status/message mapping) behind a thin `app/api/weather/route.ts`. 31 tests covering the ±24h window, upstream status mapping, and "the key never reaches the client".

**Decisions:**
- Next.js **16.3.4**, not 15 — `CLAUDE.md` stack line updated. `@types/node` pinned to `^22` because vitest 5 requires `^22 || >=24`.
- Route handler lives at `app/api/weather/route.ts`; `ARCHITECTURE.md`'s top-level `/api` folder was not achievable under the App Router.
- Timeline range requested as **unix seconds** rather than yesterday→tomorrow calendar dates — calendar dates need the location's timezone, which only arrives in the response.
- Visual Crossing's 400 for an unresolvable location is surfaced as **404**, so the client can distinguish it from a malformed request.
- Dropped the scaffold's `globals.css` — MUI `CssBaseline` owns the reset, one source of truth.
- Scaffold ticket was widened (agreed) to include the MUI/Motion/theme plumbing so the UI ticket doesn't open with setup.

**Next:** Paste a real key into `.env.local` and verify the live response (in particular that `elements=` trimming keeps `resolvedAddress` and `timezone`), then start the `SearchInput` ticket. Playwright setup is deferred until there's a flow to drive.

---

## [2026-09-08]
**Did:** Filled in PRODUCT.md, ARCHITECTURE.md, DESIGN.md, TICKETS.md for the roadmap.sh Weather Web App project. Dropped Supabase from the stack (no persistence needed).
**Decisions:** API key for Visual Crossing stays server-side via a Next.js `/api/weather` route, never called directly from the client.
**Next:** Project setup ticket — scaffold Next.js + TypeScript, add `VISUAL_CROSSING_API_KEY` env var.
