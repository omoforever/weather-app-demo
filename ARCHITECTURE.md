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

**The range is requested in unix seconds, unpadded — query cost beats a perfect window**
A yesterday→tomorrow calendar range would have to be computed in the location's timezone,
which we only learn *from* the response — for far-offset locations that drops hours at the
edge of the window. Passing epoch seconds sidesteps that, but Visual Crossing still rounds
the range out to whole calendar days in the location's timezone, and does so
inconsistently: two identical requests 20 minutes apart returned different first hours
(`2026-09-07T23:00Z` vs `2026-09-08T00:00Z`), the latter missing an hour the window needed.

Requesting a day either side fixes that completely, but the response's own `queryCost`
field shows it **doubles the price of a lookup: 25 → 49**, halving how far the free tier
goes. Padding was dropped on 2026-09-09: an occasional missing edge hour is invisible in
the UI, whereas exhausting the quota stops work. `lib/visualCrossing.ts` carries the
comment explaining how to reinstate it.

Note that `queryCost` is the number to trust — the documented "24 records per day of
hourly data" rule overestimates it by roughly 2.5×.

**Window bounds are widened to whole hours**
Readings land on the hour, so a strict `now ± 24h` filter drops the reading at the edge
whenever `now` isn't on the hour — a "now" of 23:09 yielded only ~23h of past data.
`toHourlyWindow` floors the lower bound and ceils the upper, so the hours *containing*
`now ± 24h` are included. Expect 49-50 readings, not exactly 49.

**Repeat searches are cached; refresh deliberately isn't**
`lib/weatherCache.ts` holds each location's snapshot for 10 minutes, so searching the same
place twice costs one lookup rather than two. Refresh exists to get *newer* data, so it always
goes to the network — cache and refresh pull in opposite directions on purpose, and both
directions are pinned by tests. Failed searches are never cached, so an outage can't poison a
location for the whole window. The cache is module state, which means tests must call
`clearWeatherCache()` between cases.

**Fixture mode for development**
`WEATHER_FIXTURE=1` makes `lib/visualCrossing.ts` serve generated data instead of calling the
API, so UI work costs no quota. It returns the API's own response shape, so real parsing and
trimming still run. Guarded twice — the flag must be exactly `"1"` and `NODE_ENV` must not be
production.

**"We have an error" is separate from "we have no data"**
`useWeatherSearch` records `errorMessage`/`errorStatus` independently of `status`, and the catch
block always lands on a terminal status: back to `success` when results are still on screen,
`error` only when there is nothing to fall back on. Conflating the two caused two bugs — a failed
refresh wiping good weather, and a failed search leaving `status` stuck on `loading` (spinner
spinning, search button disabled). Whether retrying is worth offering comes from `isRetryable` in
`lib/weatherErrors.ts`, which lives beside the status mapping so the two can't drift.

**Weather icons carry the condition where the words don't**
Timeline cells show an icon instead of condition text, so the icon's `aria-label` is the only
thing conveying the condition — it must never be `aria-hidden` there. On the card the words are
on screen beside it, so the icon *is* hidden to avoid a duplicate announcement. That's what
`WeatherIcon`'s `decorative` prop selects between. Colours live in a named `weather` palette in
`theme.ts` (measured at ≥3:1 against white, per WCAG non-text contrast), and day/night is
distinguished by icon shape rather than colour alone.

**Next.js 16, not 15**
Scaffolded on the current release (16.3.4) rather than the 15 originally written in
`CLAUDE.md`. `@types/node` is pinned to `^22` (matching local Node 22) because vitest 5
requires `^22 || >=24`.

## Known constraints

- Visual Crossing free tier allows 1000 records/day. A ±24h lookup reports a `queryCost` of **25**, so roughly **40 lookups/day** — measured, not estimated. Still small enough that caching the last successful lookup matters, and that dev work should lean on the mocked tests rather than live calls.
- `resolvedAddress` echoes simple input verbatim ("London" → `"London"`) but returns a fully geocoded name for anything ambiguous ("New York, NY" → `"New York, NY, United States"`). The UI should show it rather than the raw query, but can't rely on it being more specific than what was typed.
- Location input is free text — the API handles geocoding, but ambiguous/misspelled input can return a 400; surface that as a UI error rather than retrying silently.

## File manifest

Built:

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Fonts (Inter / JetBrains Mono), MUI theme + CssBaseline providers |
| `app/page.tsx` | Wires the search field to the search state and renders the results |
| `app/api/weather/route.ts` | Route handler: validates input, delegates to `lib/`, maps errors to statuses |
| `lib/visualCrossing.ts` | Builds the timeline URL and fetches it; throws `WeatherFetchError` on every failure path |
| `lib/shapeWeather.ts` | Pure transform: upstream payload → `WeatherSnapshot`, filtered to ±24h |
| `lib/weatherErrors.ts` | `WeatherFetchError` + the single upstream→HTTP status/message mapping |
| `lib/fetchWeather.ts` | Client-side call to `/api/weather`; unwraps the success/error envelope |
| `lib/formatWeather.ts` | Display formatting — rounding, units, hours in the location's timezone |
| `lib/weatherIcon.ts` | Maps a Visual Crossing `icon` slug to a MUI icon + `weather` palette token |
| `lib/weatherCache.ts` | In-memory snapshot cache, 10-minute freshness window, keyed on normalised location |
| `lib/devFixture.ts` | Generated stand-in for the API when `WEATHER_FIXTURE=1` (development only) |
| `components/RefreshControl.tsx` | Refresh button plus when the showing data was fetched |
| `components/WeatherIcon.tsx` | Renders that icon; `decorative` decides whether it announces the condition |
| `hooks/useWeatherSearch.ts` | Search state (status/snapshot/error); cancels a superseded search |
| `components/SearchInput.tsx` | Location text input + submit; never fires on blank input |
| `components/CurrentWeatherCard.tsx` | Labelled region: temp, condition, wind, rain chance, fade+slide entrance |
| `components/HourlyTimeline.tsx` | Sideways-scrolling ±24h list; decides which hour is "now" and scrolls to it |
| `components/HourlyPeriodCell.tsx` | One hour in the timeline; dimmed if past, `aria-current` if now |
| `types/weather.ts` | Shared types for the API response, UI props, and the upstream slice we read |
| `theme.ts` | MUI theme — IKB blue, 4px spacing, mono for data readouts |
| `next.config.ts` | `allowedDevOrigins` so a phone on the same wifi can load the dev server |
| `test/setup.ts`, `test/fixtures/timeline.ts` | jest-dom matchers; shared Visual Crossing fixture |

Planned: a refresh control, real loading and error components (both are plain text today),
and the two stretch goals (geolocation default, loading animation).

## Schema changes log

Not applicable — no database.
