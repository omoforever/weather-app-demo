# TICKETS.md

## Active

_(none — pull the next item from Backlog)_

## Backlog

- [ ] Refresh control — re-fetch current location's data on demand. **Carries the client-side caching** ARCHITECTURE.md has called for since the API ticket: repeat searches for the same location reuse the last snapshot rather than spending another 25 records.
- [ ] Error state — inline message for invalid location / API failure
- [ ] Loading state — skeleton/placeholder while fetching
- [ ] Decide the branch/PR workflow — CLAUDE.md's ship-it process says open a PR and merge it, but tickets so far have been committed straight to `main`, so there's nothing to open a PR from. Either start each ticket on a branch, or amend the ship-it process to match what we actually do. Raised 2026-09-09.
- [ ] Playwright setup — deferred from the scaffold ticket; there's no user flow to drive end-to-end until the search UI exists
- [ ] (Stretch) Geolocation default — use current location on first load if permitted
- [ ] (Stretch) Loading animation — Framer/Motion polish on fetch state

## Done

- [2026-09-08] Project setup — Next.js 16 + TypeScript scaffold (no `src/`), MUI v9 + emotion + Motion v12 with theme provider, Vitest + React Testing Library, `VISUAL_CROSSING_API_KEY` via `.env.local` / `.env.example`. Lint, typecheck and tests all clean.
- [2026-09-09] Dev fixture mode — `WEATHER_FIXTURE=1` makes `lib/visualCrossing.ts` return generated data from `lib/devFixture.ts` instead of calling the API, so UI work costs no quota. Cycles ten condition families so every icon is visible in one load; guarded against production twice (flag must be exactly `1` **and** `NODE_ENV !== 'production'`). 200 tests green. Verified live: 200 response, all ten icons, error paths unchanged, zero records spent.
- [2026-09-09] Motion polish — staggered timeline entrance (fixed 250ms window, so 50 cells arrive as fast as 5 and never fight the scroll-to-now), gentle idle loop on the card icon only, spinner on the search button while fetching. All off under `prefers-reduced-motion`. Cell dimming moved from `opacity` to `filter` so the entrance fade could own `opacity`. 184 tests green. Verified by Omar on laptop and phone, reduced motion included.
- [2026-09-09] Weather icons and colours — `weather` palette in `theme.ts` (all eight tokens measured ≥3:1 on white), `lib/weatherIcon.ts` mapping all 16 documented Visual Crossing slugs plus a fallback, `components/WeatherIcon.tsx`. Card icon is decorative; timeline cells show a labelled icon **instead of** condition text, so the label is the only carrier of the condition. Cells narrowed 88→72px. 161 tests green. Verified by Omar on laptop and phone; icon centring fixed on his report.
- [2026-09-09] Hourly timeline — `components/HourlyPeriodCell.tsx` (one hour; past hours dimmed, current hour marked `aria-current`) and `components/HourlyTimeline.tsx` (sideways-scrolling list that decides which hour is "now" and scrolls it into view), wired below the card. 125 tests green. Verified by Omar on laptop and phone.
- [2026-09-09] Current weather card — `lib/formatWeather.ts` (display formatting, timezone-aware hours), `components/CurrentWeatherCard.tsx` (temp, condition, wind, rain chance, fade+slide entrance honouring reduced-motion), wired into `app/page.tsx`. 104 tests green. Verified by Omar on laptop and phone. Also fixed phone access: `allowedDevOrigins` in `next.config.ts`.
- [2026-09-09] Search input + submit — `lib/fetchWeather.ts`, `hooks/useWeatherSearch.ts`, `components/SearchInput.tsx` and the wiring in `app/page.tsx`, 84 tests green. Results render as plain text pending the card ticket. Request padding dropped in the same session (query cost 49 → 25, ~40 lookups/day). Click-tested in the browser by Omar — works as expected.
- [2026-09-09] `/api/weather` route — server-side proxy with `lib/` split (fetch / pure transform / error mapping), 45 tests green. Verified live against London, Auckland (UTC+12) and New York: 200 with a complete ±24h window, 404 for an unknown location, 400 for missing/blank input, and no API key in any response. Live testing caught two window bugs (upstream day-rounding clipping the window, and hour-boundary truncation) — both fixed with regression tests.
