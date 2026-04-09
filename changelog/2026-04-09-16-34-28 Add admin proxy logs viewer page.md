# Add admin proxy logs viewer page

## What changed

- Added `app/admin/proxy-logs/page.tsx` — a new admin page that streams the `primordia-proxy` systemd service journal in real time, protected by the admin role check (shows `ForbiddenPage` for non-admins).
- Added `app/api/admin/proxy-logs/route.ts` — a new SSE API route that runs `journalctl -u primordia-proxy -f -n 100` and streams output to the client, identical in structure to the existing `/api/admin/logs` route.
- Updated `components/ServerLogsClient.tsx` — added an optional `apiPath` prop (defaults to `/api/admin/logs`) so the same component can be reused for both the primordia and primordia-proxy journals without duplication. Also added an optional `initialOutput` prop: when provided, the component initialises its state with this text and opens the SSE stream with `?n=0` (no history replay) to avoid duplicating lines.
- Updated `components/AdminSubNav.tsx` — added a "Proxy Logs" tab pointing to `/admin/proxy-logs`, alongside the existing Server Logs and Rollback tabs.
- Updated both `app/admin/logs/page.tsx` and `app/admin/proxy-logs/page.tsx` — each server component now runs `journalctl -n 100 --no-pager` via `spawnSync` at render time and passes the result as `initialOutput` to `ServerLogsClient`, so the first batch of log lines is embedded in the server-rendered HTML and visible immediately even before client-side JavaScript connects.
- Updated both `app/api/admin/logs/route.ts` and `app/api/admin/proxy-logs/route.ts` — the SSE routes now accept an optional `?n=` query parameter (defaults to `100`) so clients with `initialOutput` can open the stream with `?n=0` to follow only new lines.
- Updated `PRIMORDIA.md` — documented the new page, API route, and tab in the file map, component list, and features table.

## Why

The `primordia-proxy` reverse proxy (which handles zero-downtime blue/green routing and preview server traffic) is a separate systemd service from the main `primordia` app. Its logs were previously only accessible via SSH. This page surfaces them directly in the admin panel alongside the existing server logs view, making it easier to diagnose proxy routing issues, port assignment problems, and service startup failures.
