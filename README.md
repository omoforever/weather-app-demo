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
