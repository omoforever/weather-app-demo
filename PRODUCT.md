# PRODUCT.md

## What this is

A web app where a user enters a location and sees current weather conditions plus the surrounding 24-hour forecast. Built as a learning project (roadmap.sh: Weather Web App, intermediate).

## Problem

Practice consuming a third-party API from the frontend: async data fetching, loading/error states, and displaying time-series data cleanly.

## Target user

Solo learner (Omar), building this to practice frontend skills — not a multi-user product.

## Core user flows

### Search weather by location
1. User types a location into the input field
2. User submits the search
3. App fetches weather data for that location
4. Current temperature, wind speed, likelihood of rain, and general condition (sunny/raining/cloudy etc.) are displayed

### View surrounding 24-hour periods
1. User has a location loaded
2. App shows the previous and next 24 hours of weather around now

### Refresh weather
1. User is viewing a location's weather
2. User triggers a refresh
3. App re-fetches and updates the display without a full page reload

### (Stretch) Default to current location
1. On load, app requests the user's geolocation
2. If granted, weather for that location loads automatically, no manual search needed

## Out of scope

- User accounts, saved/favourite locations
- Forecasts beyond ±24 hours
- Any backend persistence — this is a client-facing app hitting a weather API, not a database-backed product

## Key technical decisions

- **Weather data source:** Visual Crossing Weather API (per project brief)
- **No database:** Supabase isn't needed here — override the harness default. Weather data is fetched live, nothing is persisted
- **API key handling:** proxy requests through a Next.js API route so the Visual Crossing key stays server-side, never shipped to the client

## Success criteria

- Can search any valid location and see accurate current + surrounding 24h weather
- Refresh updates data in place
- Invalid location or API failure shows a clear error state instead of crashing

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| API key exposed client-side | Route all Visual Crossing calls through a server-side Next.js API route |
| Invalid/ambiguous location input | Explicit error state in the UI, no silent failure |
| API rate limits during dev | Cache the last successful response; avoid re-fetching on every re-render |

## Future ideas

- Framer Motion loading animation (stretch goal from brief)
- Default to current location via geolocation (stretch goal from brief)
- Multi-day forecast beyond the ±24h window
