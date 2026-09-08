# ARCHITECTURE.md

## Folder structure

```
/app          # Next.js routes — search page, layout
/app/api      # route handlers — /app/api/weather proxies Visual Crossing, keeps API key server-side
/components   # UI, presentational only (SearchInput, CurrentWeatherCard, HourlyTimeline)
/lib          # weather data fetching/parsing, formatting helpers
/state        # client state (selected location, loading/error status)
/types        # WeatherResponse, HourlyPeriod, etc.
/test         # vitest setup + shared fixtures
```

The API route lives at `app/api/weather/route.ts`, not a top-level `/api` folder — the
App Router only recognises route handlers underneath `app/`.

No `/state` store needed beyond React state/context at this scale — start with `useState`/`useReducer` in a small context provider, don't reach for a library unless it gets unwieldy.

## Data flow

Client → `/api/weather?location=...` (Next.js route handler) → Visual Crossing Weather API → response shaped/trimmed server-side → client renders.

The client never calls Visual Crossing directly — the API key lives only in a server env var (`VISUAL_CROSSING_API_KEY`), read inside the route handler.

## Database schema

None. This project has no backend persistence — weather data is fetched live and not stored.

## Key decisions

**Dropped Supabase for this project**
The harness defaults to Next.js + Supabase, but this project needs no persistence — everything is a live API call. Using Supabase here would be speculative infrastructure for a learning project whose whole point is the fetch/display flow.

**API key stays server-side**
Visual Crossing calls go through `/api/weather` rather than straight from the client, so the key is never exposed in browser network requests.

**Error mapping lives in one module**
`lib/weatherErrors.ts` owns every upstream-status → HTTP-status decision and every
user-facing message. The route handler returns `WeatherFetchError.message` verbatim and
anything else as a generic 502, so upstream detail (including key problems) can't leak.
Notably: Visual Crossing answers an unresolvable location with **400**, which we surface
as **404** so the client can tell "bad location" from "bad request".

**The ±24h range is requested in unix seconds, not calendar dates**
A yesterday→tomorrow calendar range would have to be computed in the location's timezone,
which we only learn *from* the response — for far-offset locations that drops hours at the
edge of the window. Passing epoch seconds as the timeline range sidesteps the problem.

**Next.js 16, not 15**
Scaffolded on the current release (16.3.4) rather than the 15 originally written in
`CLAUDE.md`. `@types/node` is pinned to `^22` (matching local Node 22) because vitest 5
requires `^22 || >=24`.

## Known constraints

- Visual Crossing free tier has a daily request cap, and hourly data is billed at 24 records per calendar day covered. A ±24h window touches 2-3 calendar days, so each lookup costs roughly 48-72 records against the 1000/day free allowance — cache the last successful lookup client-side so refresh/re-render doesn't burn requests unnecessarily.
- Location input is free text — the API handles geocoding, but ambiguous/misspelled input can return a 400; surface that as a UI error rather than retrying silently.

## File manifest

Built:

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Fonts (Inter / JetBrains Mono), MUI theme + CssBaseline providers |
| `app/page.tsx` | Placeholder — real search UI lands with the SearchInput ticket |
| `app/api/weather/route.ts` | Route handler: validates input, delegates to `lib/`, maps errors to statuses |
| `lib/visualCrossing.ts` | Builds the timeline URL and fetches it; throws `WeatherFetchError` on every failure path |
| `lib/shapeWeather.ts` | Pure transform: upstream payload → `WeatherSnapshot`, filtered to ±24h |
| `lib/weatherErrors.ts` | `WeatherFetchError` + the single upstream→HTTP status/message mapping |
| `types/weather.ts` | Shared types for the API response, UI props, and the upstream slice we read |
| `theme.ts` | MUI theme — IKB blue, 4px spacing, mono for data readouts |
| `test/setup.ts`, `test/fixtures/timeline.ts` | jest-dom matchers; shared Visual Crossing fixture |

Planned:

| Path | Purpose |
|------|---------|
| `components/SearchInput.tsx` | Location text input + submit |
| `components/CurrentWeatherCard.tsx` | Temp, wind, rain chance, condition for "now" |
| `components/HourlyTimeline.tsx` | Scrollable ±24h period list |

## Schema changes log

Not applicable — no database.
