# TICKETS.md

## Active

- [ ] `/api/weather` route — **code complete, awaiting live verification.** Handler, `lib/` layer and 31 tests are in and green against mocked fetch. Still to do: paste a real key into `.env.local`, then confirm a live `?location=London` returns a well-formed ±24h snapshot and that `elements=` trimming doesn't strip `resolvedAddress`/`timezone` from the real payload.

## Backlog

- [ ] Search input + submit — `SearchInput` component, wired to trigger a fetch
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
