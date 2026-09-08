# TESTING.md

## Philosophy

Every code file gets a test, using whichever library fits that file's layer. Test behavior, not implementation. No file merges without corresponding tests unless there's a specific, stated reason it's exempt.

## What to cover

- Business logic in `/lib` — unit tests (Vitest)
- API routes/server actions — integration tests, including failure paths (Vitest / Supertest)
- Components — render + interaction tests (React Testing Library), not snapshot tests
- Critical user flows (from PRODUCT.md) — at least one end-to-end test each (Playwright)
- Anything that previously broke in production — regression test added at fix time

## Exemptions

Keep this list short and explicit — anything not listed here gets tested:

- Pure type/interface files with no logic
- Config files
- Third-party library internals (test your usage of them, not the library itself)

## Tools

- Unit/integration: Vitest
- Component: React Testing Library
- End-to-end: Playwright

## Commands

```
npm test           # unit/integration
npm run test:e2e   # end-to-end
```

## Before marking a ticket done

- Every new/changed file has a corresponding test, unless it's on the exemptions list
- Existing tests pass
- No console errors/warnings introduced
