# DESIGN.md

## Design system

Default: Sift.
- Color: IKB blue as primary
- Typography: Inter (UI), JetBrains Mono (code/data)
- Grid: 4px base unit

No project-specific override — small enough project to use the default as-is.

## Component library

MUI v9. Likely components: `TextField` + `IconButton` for search, `Card` for current weather, a horizontally scrollable row (custom, MUI `Stack` + overflow) for the 24h timeline.

## Motion

Motion v12. Stretch goal from the brief: animate the loading state (e.g. a subtle fade/skeleton while fetching) rather than a bare spinner.

## UX principles

- Clarity over density
- Consistent spacing and alignment (4px grid)
- Every interactive element gives feedback: search shows a loading state, refresh shows a loading state, errors are visible and specific
- Mobile behavior: responsive — single-column layout, timeline scrolls horizontally on narrow viewports

## Animation specifications

- Entrance: fade+slide on the weather card when data loads
- Loading: skeleton or subtle pulse on the card while fetching (stretch goal)
- Micro-interactions: standard MUI hover/press states, nothing custom needed at this scale

## Key views

**Search / empty state**
Just the location input, centered, no weather data yet.

**Loaded state**
Search input at top, current weather card below (temp, wind, rain %, condition), horizontal 24h timeline underneath, refresh control (icon button or pull-to-refresh) near the card.

**Error state**
Input stays, card area shows an inline message (e.g. "Couldn't find that location") instead of stale/blank data.

## Patterns log

- Errors surface inline near the thing that failed (not a global toast) — keeps it obvious which action caused it.
- Loading state replaces the card content, not the whole page — search input stays interactive.
