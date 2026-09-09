# PROGRESS.md

Running log, newest at top. One entry per session or meaningful chunk of work — not per commit.

## Current state

All three core flows from PRODUCT.md are done, with icons, motion polish, caching and a proper error state. 279 tests green, lint and typecheck clean, verified against the live API. Remaining: the loading state is still plain "Loading…" text, plus Playwright setup, the branch/PR decision, and two stretch goals. Next ticket is Loading state.

`WEATHER_FIXTURE` is currently **empty** — the app is hitting the real API (25 records per search). Set it to `1` and restart for free UI work.

---

## [2026-09-09] — session 10

**Did:** Error state ticket. `isRetryable` in `lib/weatherErrors.ts`, `errorStatus` and `retry()` in `useWeatherSearch`, `components/ErrorNotice.tsx`, wired into `app/page.tsx`. 279 tests.

**Two bugs fixed, both about the same confusion — treating "we have an error" and "we have no data" as one thing:**

1. **Found while planning.** A failed *refresh* set `status = 'error'`, and the page only rendered results on `'success'` — so a network hiccup while updating threw away weather the user was reading. Errors are now recorded independently of whether results exist.
2. **Found by Omar in the browser, after I thought the ticket was done.** A search sets `'loading'` on the way in; my catch block only set a new status when there were *no* results. So a failed search *after* a successful one left status stuck on `'loading'` — spinner spinning forever, "Loading…" showing, and the search button disabled, with no way to try anywhere else. The catch now always lands on a terminal status.

**Why the tests missed #2:** I had a test for exactly that scenario which asserted the snapshot and the error message — but not the status, which was the one field that was wrong. The page test checked the search *field* was enabled, not the *button*. Lesson recorded in `README.md`: assert the state machine's state explicitly, not just its neighbours.

**Decisions:**
- Retry is offered only for retryable statuses (429, 5xx). `isRetryable` lives beside `fromUpstreamStatus` so a new status mapping can't be added without deciding what retrying it should do.
- A rejected API key (our 500) counts as retryable. Retrying won't fix it, but it isn't the user's input at fault, and a Try again button is a gentler dead end than implying their search was wrong.
- `ErrorNotice` doesn't decide retry-ability — the page passes `onRetry` only when it applies. One rule, one home.
- **Deviation from DESIGN.md, recorded in its patterns log:** errors now sit *alongside* results rather than replacing them.
- `retry()` reads a different ref from `refresh()`: the last *attempted* location, not the last *loaded* one. A failed search never became "loaded".

**Next:** Loading state ticket — replace "Loading…" with a skeleton.

---

## [2026-09-09] — session 9

**Did:** Refresh control ticket, which also carried the caching: `lib/weatherCache.ts` + tests, `refresh()`/`isRefreshing`/`updatedAtMs` in `useWeatherSearch` + tests, `components/RefreshControl.tsx` + tests, wired into the page. 237 tests.

**Decisions:**
- **Cache TTL is 10 minutes**, in memory only. Weather moves slowly enough to reuse, not so slowly that data goes misleading. A durable cache would raise questions about stale data across days that this project doesn't need to answer.
- Cache keys are normalised (`"London"`, `" london "`, `"LONDON"` are one entry) — otherwise a casing difference silently costs another 25 records.
- **Refresh bypasses the cache by design**; without that the button would do nothing while an entry stayed fresh. Search and refresh share one `load()` differing only in cache use and which busy flag they set.
- Refresh **updates in place**: it sets `isRefreshing` rather than `status = 'loading'`, so the card stays on screen. Search replaces the screen; refresh doesn't.
- Refresh re-sends the location **as typed**, not as the API geocoded it — the resolved name is an output, not the query.
- Failed searches are never cached, so one outage can't poison a location for ten minutes.
- "Updated 14:32" uses the **viewer's** timezone while the forecast uses the location's. Reused `formatHour` rather than writing a new formatter.

**Caught by tests:** six existing tests failed as soon as the cache landed — module state meant a cached London leaked between tests. Both test files now call `clearWeatherCache()` in `beforeEach`. That's the standing tax on module-level state.

**Next:** Error state ticket.

---

## [2026-09-09] — session 8

**Did:** Motion polish ticket: staggered timeline entrance, gentle idle loop on the card icon, spinner on the search button. 184 tests.

**Decisions:**
- Stagger spreads cells across a **fixed 250ms window** rather than a fixed per-cell step — 50 cells arrive as quickly as 5. A flat 20ms each would take a second, with cells still moving after the scroll-to-now.
- Cells rise vertically, never horizontally, so the entrance can't fight the sideways scroll to the current hour.
- Dimming moved from `opacity` to `filter: opacity(0.55)` because the entrance fade needed `opacity`. Two owners of one property meant cells rendered invisible and three tests failed — fixed the cause rather than loosening the tests.
- Idle loops on the card icon only. The `motion.span` wrapper isn't rendered at all when idle is off or reduced motion is on, so the ~50 timeline icons carry no animation machinery.
- Idle motions are a pure function returning objects, so they're tested as data (sun rotates, storm flashes without moving, nothing loops faster than 2s) rather than by waiting on frames.

**Then, in the same session — dev fixture mode.** Omar flagged we were over halfway through the day's Visual Crossing allowance, with manual UI testing the main consumer. `WEATHER_FIXTURE=1` now makes `lib/visualCrossing.ts` return generated data from `lib/devFixture.ts` instead of calling the API.

- The fixture cycles ten condition families, so one load shows every icon and colour — no waiting for it to snow somewhere.
- It returns the same nested day/hour shape as the API, so the real parsing and window-trimming run against it. A fixture that skipped those paths would let bugs hide.
- Guarded twice: the flag must be exactly `"1"` **and** `NODE_ENV !== 'production'`. A dev convenience must never serve invented weather to real users.
- Currently **switched on** in `.env.local`. Set `WEATHER_FIXTURE=` and restart to go back to live data.

**Next:** Refresh control, including the client-side caching (repeat searches shouldn't cost another 25 records).

---

## [2026-09-09] — session 7

**Did:** Built the Weather icons and colours ticket (first half of the polish pass, prioritised ahead of refresh/error/loading at Omar's request): `weather` palette in `theme.ts`, `lib/weatherIcon.ts` + tests, `components/WeatherIcon.tsx` + tests, wired into the card and the timeline cell. 161 tests.

**Decisions:**
- Named colour tokens (`weather.sun`, `weather.rain`…) via MUI module augmentation, so the mapping states meaning and the theme owns appearance. Typos in token names now fail to compile.
- **Contrast was measured, not assumed.** `snow` at `#4FA3C7` was 2.84:1 on white — below the 3:1 WCAG requires for meaningful graphics. Darkened to `#3E86A6` (4.07:1); all eight tokens now pass. Pale-on-white is the trap.
- Day/night distinguished by icon *shape* (sun vs crescent, cloud vs moon-behind-cloud), never colour alone. Pinned by a test.
- There is no sun-behind-cloud icon in `@mui/icons-material`, so partly-cloudy uses an outline cloud against `cloudy`'s filled one. Rain/showers, the three thunder variants and the three snow variants each share an icon — a documented compromise, with the specific condition preserved in the label.
- `WeatherIcon` takes `decorative`: on the card the condition is written beside it, so the icon is `aria-hidden` to avoid a double announcement; in cells the icon *replaces* the words, so its label is the sole carrier of the condition. Getting this backwards is silent unless you listen to the page.
- Unknown slugs fall back to a plain cloud rather than rendering nothing.

**Caught in review:** the cell's icon wasn't centred — `textAlign: center` centres text but an SVG is a flex item and needs `alignItems`. Every test passed with the icon against the left edge; found by Omar looking at his phone. Regression test added.

**Also:** MUI v9's `Stack` no longer accepts `alignItems` as a prop (it belongs in `sx`) — `tsc` caught it, tests didn't. Fourth time this session the typechecker found what green tests missed.

**Next:** Motion polish ticket (staggered timeline entrance, gentle idle loop on the card icon, spinner on the search button).

---

## [2026-09-09] — session 6

**Did:** Built the Hourly timeline ticket file by file: `components/HourlyPeriodCell.tsx` + tests, `components/HourlyTimeline.tsx` + tests, wired below the card in `app/page.tsx`. 125 tests.

**Decisions:**
- The timeline decides which hour is "now" and tells each cell, so 50 cells can't disagree. The current reading is floored to its hour to match a cell (a 22:47 reading belongs to the 22:00 cell).
- The timeline auto-scrolls the current hour into view. Without it the list opens on yesterday morning, since it starts 24h in the past.
- Past hours are dimmed; the current hour is highlighted **and** carries `aria-current="time"` so it isn't visual-only. Added after asking how the "now" marker would be tested.
- `CurrentWeatherCard` is now a labelled `<section>` (`region`, "Current conditions"). Forced by a real test failure: once the timeline was on the page, "15°C" matched both the card and several cells. Better semantics as well as unambiguous tests.
- The cell takes `ref` as a plain prop — React 19 no longer needs `forwardRef` for this.
- Three times this session `tsc` caught what green tests missed (loosely-typed mocks). Worth running typecheck as well as tests before believing a file is done.

**Next:** Refresh control ticket.

---

## [2026-09-09] — session 5

**Did:** Built the Current weather card ticket file by file: `lib/formatWeather.ts` + tests (display formatting, hours rendered in the location's own timezone), `components/CurrentWeatherCard.tsx` + tests, and swapped the placeholder text in `app/page.tsx` for the card. 104 tests.

Fixed phone access to the dev server: `allowedDevOrigins: ['192.168.1.73']` in `next.config.ts`.

**Decisions:**
- Formatting lives in `lib/`, not in the card, so the timeline shows the same values the same way.
- Hours are formatted with `Intl.DateTimeFormat` in the location's timezone — looking up Tokyo from London shows Tokyo's clock. `hourCycle: 'h23'` and `hour: '2-digit'` keep it locale-independent and column-aligned.
- The card's entrance animation drops the slide (keeping the fade) when the viewer has reduced motion enabled.
- The card's own tests stub Motion to assert *our* decision; `app/page.test.tsx` renders it with the real library, so both are covered.
- No weather icon — the API gives an icon slug but mapping slugs to icons isn't asked for in DESIGN.md. Easy to add later.
- Reusable lessons (the `allowedDevOrigins` fix, `queryCost` vs docs, `next dev` writing into CLAUDE.md) are collected in `README.md` for folding back into the harness template.

**Next:** Hourly timeline ticket.

---

## [2026-09-09] — session 4

**Did:** Built the Search input ticket, one file at a time for review: `lib/fetchWeather.ts` (client call to our own route), `hooks/useWeatherSearch.ts` (status/snapshot/error state), `components/SearchInput.tsx` (presentational field + submit), and the wiring in `app/page.tsx` — each with tests, 84 total.

Then dropped the request padding added yesterday.

**Decisions:**
- **Padding removed.** The response's own `queryCost` field reports **25 unpadded vs 49 padded** — so padding halved the free tier from ~40 lookups/day to ~20. Not worth it here: a missing edge hour is invisible, running out of quota isn't. A test pins the unpadded range so it can't be undone by accident.
- **My earlier "120 records / 8 lookups a day" figure was wrong** — it came from the documented "24 records per calendar day" rule, which overestimates by ~2.5×. `queryCost` in the response is the number to trust.
- Aborted searches are kept distinct from failed ones all the way through the stack, so a fast second search can't be reported as an error by the first.
- Used `fireEvent` rather than adding `@testing-library/user-event` as a dependency.
- React 19's types deprecate `FormEvent` ("doesn't actually exist") — use `SyntheticEvent`. Caught by Omar's IDE, not by `tsc`, since it's a hint rather than an error.

**Verified:** Omar click-tested the flow at localhost:3000 — search, results, error, and recovery all behave.

**Next:** Current weather card ticket.

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
