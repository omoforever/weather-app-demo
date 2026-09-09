# Using this harness

1. Copy all files into the root of a new project.
2. Fill in `PRODUCT.md` first — everything else follows from it.
3. Fill in `DESIGN.md` / `ARCHITECTURE.md` with project-specific overrides (defaults are pre-filled with your usual stack/system).
4. Start every Claude Code session by pointing it at `CLAUDE.md` — it links out to the rest.
5. Keep `PROGRESS.md` and `TICKETS.md` current as you go; they're the state that carries across sessions.

## Lessons worth carrying into the next project

Things learned here that aren't specific to weather. Fold these into the templates.

### Testing on a phone needs `allowedDevOrigins` (Next 15+)

Loading the dev server from another device on the same wifi (`http://192.168.1.73:3000`)
fails with *"Blocked cross-origin request to Next.js dev resource /_next/hmr"*. Next blocks
cross-origin requests to `/_next/*` in development by default, so a site you happen to
visit can't reach your dev server.

Fix, in `next.config.ts` — dev only, no effect on a production build:

```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.73'], // laptop's LAN address; `npm run dev` prints it as "Network:"
}
```

Restart the dev server afterwards. The address is DHCP-assigned, so it can change after a
router reboot — if the error returns with a different number, update it.

### `next dev` writes into `CLAUDE.md` by itself

Next 16 appends a `<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md` and re-adds it if
removed. Commit it rather than fighting it, or set `agentRules: false` in `next.config.ts`.

### Trust an API's own reported cost, not its pricing docs

Visual Crossing's docs imply "24 records per day of hourly data"; the `queryCost` field in
each response reported ~2.5× less. Estimating from the docs led to a wrong decision about
how wide a range to request. If an API reports its own usage, read that.

### Test manually on a phone before calling UI work done

The laptop browser showed nothing wrong. The phone surfaced a blocking error immediately.

### Build the fixture mode *before* the UI, not after

**The most expensive mistake of this project.** Building against a metered API, over half a
day's allowance went on manually checking icon colours and animations — none of which needed
real weather at all. The fix took about twenty minutes and should have been the first ticket
after the API route.

The shape that worked (`lib/devFixture.ts`, `lib/visualCrossing.ts`):

- one env flag, `WEATHER_FIXTURE=1`, checked in the fetch layer so nothing above it changes
- generated data returned **in the API's own response shape**, so the real parsing, trimming
  and error handling still run — a fixture that shortcuts those lets bugs hide
- data anchored to "now" at call time, not a fixed date, so it never rots
- deliberately *varied*: it cycles every condition family, so one load shows every icon
  instead of waiting for real snow
- visibly marked (`"London (fixture)"`) so there's no doubt which mode you're in
- guarded twice — the flag must be exactly `"1"` **and** `NODE_ENV !== 'production'`, so a
  dev convenience can never serve invented data to real users, and a stray
  `WEATHER_FIXTURE=false` can't switch it on by being a truthy string

Ask early: *what in this project is metered, and what will I burn it on?* For a learning
project the answer is almost always manual UI checking.

### Contrast is measured, not eyeballed

A weather icon colour described in a code comment as "pale but still legible" measured
2.84:1 against white — under the 3:1 WCAG requires for meaningful graphics. Pale on white is
the trap. Compute the ratio rather than trusting a comment (or an eye).

### Some bugs no test will catch

An icon sat hard against the left edge of every timeline cell and the entire suite passed —
`textAlign` centres text, but an SVG is a flex item and needs `alignItems`. Found by looking
at a phone. Automated tests verify behaviour and semantics; someone still has to look at it.
