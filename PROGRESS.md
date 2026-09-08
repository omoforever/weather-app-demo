# PROGRESS.md

Running log, newest at top. One entry per session or meaningful chunk of work — not per commit.

## Current state

Scaffold is up and `/api/weather` is written and unit/integration tested (31 tests green, lint and typecheck clean). Not yet verified against the live API — `.env.local` needs a real `VISUAL_CROSSING_API_KEY`. No UI beyond a placeholder page; next ticket is `SearchInput`.

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
