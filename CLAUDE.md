# CLAUDE.md

This is the entry point. Read this first, then pull in the other docs as needed for the task at hand — don't load all of them for every task.

## Doc map

- `PRODUCT.md` — what we're building and for whom. Read before any feature work.
- `DESIGN.md` — visual system, components, UX patterns. Read before UI work.
- `ARCHITECTURE.md` — folder structure, data flow, schema, key decisions. Read before backend/structural work.
- `TESTING.md` — what and how to test. Read before writing tests.
- `PROGRESS.md` — current state, what's done, what's in flight. Read at the start of every session.
- `TICKETS.md` — active and backlog work items. Read to pick up the next task.

## Stack

- Next.js 16, TypeScript, React 19
- MUI v9, Motion v12
- No database — this project is client-facing only, hitting the Visual Crossing Weather API through a server-side Next.js route (see ARCHITECTURE.md). Supabase (harness default) is dropped here as unneeded.
- npm
- No `src/` folder — routes and modules live at the project root under their own top-level folders

## Coding standards

- **file_length_and_structure** — 500-line hard cap per file; split well before that. Proper folders (`components/`, `hooks/`, `lib/`, `types/`); one component per file.
- **component_and_function_size** — functions under 20-30 lines; components under 150 lines. Extract complex logic into hooks.
- **single_responsibility** — every file/function does one thing. Split immediately if it's doing two.
- **separation_of_concerns** — UI components, business logic, state, and API calls each live in their own layer — never mixed in one file.
- **naming_and_readability** — descriptive names (`RiderTable`, not `Table2`); boolean vars read clearly (`isLoading`, `hasError`); avoid `data`/`info`/`helper`/`temp`.
- No speculative abstraction. Build for what's needed now.
- Prefer explicit over clever. Optimize for the next person reading this (probably me, in three months).

## Feature development process

1. **Define outcomes first.** Before writing code: what files are involved, what can the user do when it's done (as checkboxes), what routes/pages are needed.
2. **Plan implementation.** List files to create with purpose, sketch structure, identify existing patterns to reuse.
3. **Research and plan before executing.** Discuss the approach in conversation first. Don't jump straight to code for anything non-trivial.
4. **Build and verify.** Run the type checker, test each outcome checkbox, add tests (`TESTING.md`).
5. Check `PROGRESS.md` and `TICKETS.md` at the start of a session to orient; work agreed plans as tickets.
6. On completing a chunk of work: update `PROGRESS.md`, close out the ticket in `TICKETS.md`, and note any new decisions in `ARCHITECTURE.md` if relevant.
7. Don't silently expand scope. If something outside the current ticket needs doing, flag it and add it as a new ticket rather than folding it in.

## Ship it process

Triggers: "ship it", "wrap up", "end of session". Run this sequence without stopping for confirmation between steps:

1. Make sure all new/changed files have tests (`TESTING.md`) and tests pass.
2. Commit with a clear, conventional message (what changed and why).
3. Push and open a PR against the default branch, with a short description and a reference to the ticket.
4. Merge the PR.
5. Update `PROGRESS.md` and close the ticket in `TICKETS.md`.

If tests are failing or something's unresolved, stop and flag it instead of shipping anyway.

## Working habits

- Small, reviewable chunks over large sweeping changes.
- Ask before introducing a new dependency.
- Ask before changing an established pattern (e.g. a folder structure or naming convention already in use elsewhere in the project) rather than deviating quietly.
- Surface trade-offs rather than picking silently when there's a real judgment call.

## Keeping this harness usable

- **One source of truth per fact.** If a file manifest, status, or decision is recorded in two files, it will drift — pick which file owns it and have the other link to it instead of duplicating.
- **Split out what's grown too big.** If `PROGRESS.md` (or any file here) gets long enough that reading it every session is wasteful, move the history into a `SESSION_LOG.md`, keep only current state in the original, and note the split here.
