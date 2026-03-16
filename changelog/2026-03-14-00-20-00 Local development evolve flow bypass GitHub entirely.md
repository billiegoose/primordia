Added a local development evolve flow that creates a git worktree preview without touching GitHub.

**What changed**:
- `lib/local-evolve-sessions.ts` (new): module-level singleton that holds all active local evolve sessions in a `Map`. Contains the full business logic: creates a git worktree at `../primordia-preview-{timestamp}`, symlinks `node_modules` and `.env.local`, spawns `claude --dangerouslySkipPermissions -p "..."` as a child process, then starts `npm run dev` on the next available port ≥ 3001. Also exposes `acceptSession` (merge + cleanup) and `rejectSession` (cleanup only).
- `app/api/evolve/local/route.ts` (new): `POST` starts a session and returns a `sessionId` immediately (fire-and-forget); `GET ?sessionId=...` returns `{ status, logs, port, previewUrl }` for client polling.
- `app/api/evolve/local/manage/route.ts` (new): `POST { action: "accept"|"reject", sessionId }` — accept merges the preview branch into main and kills the dev server; reject just cleans up.
- `components/ChatInterface.tsx`: in evolve mode, branches on `process.env.NODE_ENV === "development"` to call the new local flow instead of the GitHub Issues flow. Adds `localEvolveSession` state, a `localPollingRef` interval (5 s), `handleLocalEvolveSubmit`, `handleLocalAccept`, `handleLocalReject`, an updated evolve-mode banner, and an accept/reject card that appears when the preview server is ready. The existing GitHub flow is unchanged.
- `PRIMORDIA.md`: updated File Map and Data Flow sections.

**Why**: When iterating locally, creating a GitHub Issue → waiting for CI → waiting for a Vercel deploy is slow. The new flow lets a developer see changes in a local preview server within minutes and accept/reject without touching GitHub.
