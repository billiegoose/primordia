# Add user event tracking system

## What changed

### Database
- Added `events` table to SQLite (via `lib/db/sqlite.ts`) with schema:
  ```sql
  CREATE TABLE events (
    id      INTEGER PRIMARY KEY,
    ts      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    user_id TEXT,
    event   TEXT NOT NULL,
    props   TEXT  -- JSON blob
  ) STRICT;
  CREATE INDEX idx_events_ts    ON events(ts);
  CREATE INDEX idx_events_event ON events(event);
  CREATE INDEX idx_events_user  ON events(user_id);
  ```
- Added `appendEvent`, `queryEvents`, and `countEvents` methods to `DbAdapter` interface (`lib/db/types.ts`) and the SQLite adapter.

### API endpoint — `POST /api/events`
- Single write endpoint for all producers: browser, Next.js server code, agent workers.
- Open (no auth required) — session cookie is read automatically when present; callers can also pass `userId` explicitly for server/worker contexts without a session.
- Body: `{ event: string, props?: Record<string, unknown> | null, userId?: string | null }`
- Returns `{ id }` (the inserted row id) with status 201.

### API endpoint — `GET /api/events`
- Admin-only query endpoint used by the event log viewer.
- Query params: `limit`, `offset`, `event` (exact match filter), `userId` (exact match filter).
- Returns `{ rows, total, limit, offset }`.

### Client/server helper — `lib/events-client.ts`
- `trackEvent(event, props?)` — fire-and-forget browser helper (uses `keepalive: true` so requests survive page unload).
- `appendEvent(event, props?, userId?)` — async server/worker helper.
- Both silently swallow errors so tracking never breaks the UI or pipeline.

### Event naming convention
Versioned slash-suffix format, e.g.:
```
{ "name": "file-attachment-removed/v1",
  "props": { "source": "evolve/remove-file-attachment", "el": "button", "trigger": "mouse" } }
```

### Admin event log viewer — `/admin/events`
- New page `app/admin/events/page.tsx` + client component `EventsClient.tsx`.
- Paginated table (50 rows/page) showing: id, timestamp (UTC), event name, user id, props.
- Click any row to expand its props as pretty-printed JSON.
- Filter by event name and/or user ID; refresh button; prev/next pagination.
- Added "Events" tab to `components/AdminSubNav.tsx`.

## Why
Provides a foundation for understanding user behaviour — which flows are used, where users drop off, which actions trigger errors — without requiring an external analytics service. The versioned event name scheme (`action/v1`) allows safe schema evolution over time.
