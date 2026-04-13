# Drop port and "Primordia" suffix from window titles

## What changed

`lib/page-title.ts` — simplified the page title format:

- **Removed** the `— Primordia` suffix appended to every page title (e.g. "Chat — Primordia" → "Chat").
- **Removed** the `:{port}` segment from development titles (e.g. `:3000`).
- **Kept** the page name and, in development mode, the git branch slug (session identifier).

New formats:

| Mode        | With page name          | Landing page   |
|-------------|-------------------------|----------------|
| Production  | `{pageName}`            | `Primordia`    |
| Development | `{pageName} — {branch}` | `{branch}`     |

## Why

Browser tab titles were cluttered with redundant information. The app name ("Primordia") adds no value once you're already inside the app, and the port is irrelevant to day-to-day use. The branch slug is retained in development because it's the session slug that identifies which instance / worktree you're looking at.
