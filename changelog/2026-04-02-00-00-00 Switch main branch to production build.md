# Switch main branch to production build

## What changed

- **`scripts/primordia.service`** — `ExecStart` changed from `bun run dev` to `bun run start`. The systemd service now runs the compiled production bundle instead of the Turbopack dev server.

- **`scripts/deploy-to-exe-dev.sh`** — Added a `bun run build` step (with `PRIMORDIA_EVOLVE=true`) between `bun install` and `install-service.sh`. The production bundle is built on each deploy before the service is restarted.

- **Evolve API routes** (6 files) — Replaced `process.env.NODE_ENV !== 'development'` guards with `process.env.PRIMORDIA_EVOLVE !== 'true'`. Previously the evolve feature was gated on `NODE_ENV`, which meant it could never work in a production build. It is now gated on an explicit opt-in env var instead.
  - `app/api/evolve/route.ts`
  - `app/api/evolve/stream/route.ts`
  - `app/api/evolve/manage/route.ts`
  - `app/api/evolve/followup/route.ts`
  - `app/api/evolve/upstream-sync/route.ts`
  - `app/api/evolve/kill-restart/route.ts`

- **`.env.example`** — Added `PRIMORDIA_EVOLVE=true` entry with documentation.

- **`PRIMORDIA.md`** — Updated architecture docs: hosting description, evolve section heading, deploy flow description, and environment variables table.

## Why

The main branch was running `bun run dev` (Turbopack + hot-reload + verbose error overlays). A production build (`bun run build && bun run start`) is more appropriate for the live instance: faster startup, smaller memory footprint, no hot-reload overhead, and proper `NODE_ENV=production` behaviour (e.g. secure cookies set correctly).

The previous evolve gate used `NODE_ENV !== 'development'` which made the evolve feature mutually exclusive with a production build. Decoupling it into `PRIMORDIA_EVOLVE=true` lets the production server enable evolve explicitly while still running an optimised bundle. Worktree preview instances continue to run `bun run dev` as before — that path is unchanged.
