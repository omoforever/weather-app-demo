# TICKETS.md

## Active

_(none — pull the next item from Backlog)_

## Backlog

- [ ] Current weather card — temp, wind speed, rain likelihood, condition
- [ ] Hourly timeline — previous + next 24h periods, horizontally scrollable
- [ ] Refresh control — re-fetch current location's data on demand
- [ ] Error state — inline message for invalid location / API failure
- [ ] Loading state — skeleton/placeholder while fetching
- [ ] Playwright setup — deferred from the scaffold ticket; there's no user flow to drive end-to-end until the search UI exists
- [ ] (Stretch) Geolocation default — use current location on first load if permitted
- [ ] (Stretch) Loading animation — Framer/Motion polish on fetch state

## Done

- [2026-09-08] Project setup — Next.js 16 + TypeScript scaffold (no `src/`), MUI v9 + emotion + Motion v12 with theme provider, Vitest + React Testing Library, `VISUAL_CROSSING_API_KEY` via `.env.local` / `.env.example`. Lint, typecheck and tests all clean.
- [2026-09-09] Search input + submit — `lib/fetchWeather.ts`, `hooks/useWeatherSearch.ts`, `components/SearchInput.tsx` and the wiring in `app/page.tsx`, 84 tests green. Results render as plain text pending the card ticket. Request padding dropped in the same session (query cost 49 → 25, ~40 lookups/day). Click-tested in the browser by Omar — works as expected.
- [2026-09-09] `/api/weather` route — server-side proxy with `lib/` split (fetch / pure transform / error mapping), 45 tests green. Verified live against London, Auckland (UTC+12) and New York: 200 with a complete ±24h window, 404 for an unknown location, 400 for missing/blank input, and no API key in any response. Live testing caught two window bugs (upstream day-rounding clipping the window, and hour-boundary truncation) — both fixed with regression tests.
