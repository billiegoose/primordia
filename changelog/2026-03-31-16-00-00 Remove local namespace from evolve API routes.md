# Remove `local/` namespace from evolve API routes

## What changed

The `/api/evolve/local/` URL prefix has been removed. All five evolve API routes now live directly under `/api/evolve/`:

| Old path | New path |
|---|---|
| `POST /api/evolve/local` | `POST /api/evolve` |
| `GET /api/evolve/local?sessionId=…` | `GET /api/evolve?sessionId=…` |
| `POST /api/evolve/local/manage` | `POST /api/evolve/manage` |
| `POST /api/evolve/local/followup` | `POST /api/evolve/followup` |
| `POST /api/evolve/local/restart` | `POST /api/evolve/restart` |
| `POST /api/evolve/local/kill-restart` | `POST /api/evolve/kill-restart` |

### Files moved

- `app/api/evolve/local/route.ts` → `app/api/evolve/route.ts`
- `app/api/evolve/local/manage/route.ts` → `app/api/evolve/manage/route.ts`
- `app/api/evolve/local/followup/route.ts` → `app/api/evolve/followup/route.ts`
- `app/api/evolve/local/restart/route.ts` → `app/api/evolve/restart/route.ts`
- `app/api/evolve/local/kill-restart/route.ts` → `app/api/evolve/kill-restart/route.ts`

Relative import paths within each route file were updated accordingly (one fewer directory level).

### Components updated

- `components/EvolveForm.tsx` — fetch target updated from `/api/evolve/local` → `/api/evolve`
- `components/AcceptRejectBar.tsx` — fetch targets updated for `/manage` and `/restart`
- `components/EvolveSessionView.tsx` — fetch targets updated for all five endpoints

### PRIMORDIA.md updated

The file map and data flow sections now reference the new paths.

## Why

The `/local/` prefix was introduced early in the project to distinguish the local-development evolve flow from a GitHub/Vercel-based flow that was planned at the time. That GitHub/Vercel flow was subsequently removed; the local flow is now the only evolve flow. With nothing to distinguish from, the `local/` namespace is purely noise. Removing it makes the API surface cleaner and more intuitive.
