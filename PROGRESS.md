# PROGRESS.md

Running log, newest at top. One entry per session or meaningful chunk of work — not per commit.

## Current state

Both core flows from PRODUCT.md work, now with coloured weather icons on the card and in every timeline cell. 161 tests green, lint and typecheck clean, verified on laptop and phone. Still plain text: loading and error. Still missing: refresh, and both stretch goals. Next ticket is Motion polish, then Refresh control.

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
