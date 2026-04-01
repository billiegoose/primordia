# Rename `lib/local-evolve-sessions.ts` → `lib/evolve-sessions.ts`

## What changed

- Renamed `lib/local-evolve-sessions.ts` to `lib/evolve-sessions.ts`.
- Updated the internal file-path comment at line 1 of the file.
- Updated all six import sites:
  - `app/api/evolve/route.ts`
  - `app/api/evolve/manage/route.ts`
  - `app/api/evolve/followup/route.ts`
  - `app/api/evolve/kill-restart/route.ts`
  - `app/api/evolve/upstream-sync/route.ts`
  - `app/evolve/session/[id]/page.tsx`
- Updated the File Map entry in `PRIMORDIA.md`.

## Why

The `local-` prefix was a historical artifact from when the evolve pipeline was first introduced as a local-only alternative to a planned GitHub-based flow. That distinction no longer exists — the evolve flow is always local. Dropping the prefix makes the module name shorter, more consistent with the rest of `lib/`, and easier to import.
