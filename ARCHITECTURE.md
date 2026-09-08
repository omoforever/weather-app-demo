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

**The range is requested in unix seconds, padded by a day, then trimmed locally**
A yesterday→tomorrow calendar range would have to be computed in the location's timezone,
which we only learn *from* the response — for far-offset locations that drops hours at the
edge of the window. Passing epoch seconds sidesteps that, but Visual Crossing still rounds
the range to whole calendar days in the location's timezone, and does so inconsistently:
two identical unpadded requests 20 minutes apart returned different first hours
(`2026-09-07T23:00Z` vs `2026-09-08T00:00Z`), the latter missing an hour the window needed.
So `lib/visualCrossing.ts` asks for a day either side and `lib/shapeWeather.ts` trims to
the window. Verified live against London, Auckland (UTC+12) and New York.

**Window bounds are widened to whole hours**
Readings land on the hour, so a strict `now ± 24h` filter drops the reading at the edge
whenever `now` isn't on the hour — a "now" of 23:09 yielded only ~23h of past data.
`toHourlyWindow` floors the lower bound and ceils the upper, so the hours *containing*
`now ± 24h` are included. Expect 49-50 readings, not exactly 49.

**Next.js 16, not 15**
Scaffolded on the current release (16.3.4) rather than the 15 originally written in
`CLAUDE.md`. `@types/node` is pinned to `^22` (matching local Node 22) because vitest 5
requires `^22 || >=24`.

## Known constraints

- Visual Crossing free tier allows 1000 records/day, and hourly data is billed at 24 records per calendar day covered. Because the request is padded by a day either side (see key decisions), each lookup spans 5 calendar days ≈ **120 records** — roughly 8 lookups/day. This is the price of a reliably complete ±24h window; client-side caching of the last successful lookup is therefore not optional, and dev work should lean on the mocked tests rather than live calls.
- `resolvedAddress` echoes simple input verbatim ("London" → `"London"`) but returns a fully geocoded name for anything ambiguous ("New York, NY" → `"New York, NY, United States"`). The UI should show it rather than the raw query, but can't rely on it being more specific than what was typed.
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
