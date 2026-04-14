# Sticky harness and model defaults for evolve forms

## What changed

### Sticky preference across new requests (server-side DB)
`EvolveRequestForm` now persists the user's chosen harness and model to the
database (via `GET`/`PATCH /api/user/preferences`) so the preference follows
the user across browsers and devices. The next time a new-request form is
opened (on `/evolve`, in the floating dialog, or elsewhere), the stored values
are fetched on mount so the user doesn't have to re-select their preferred
agent every time.

Preferences are stored in a new `user_preferences` table — a generic per-user
key-value store with keys `evolve:preferred-harness` and
`evolve:preferred-model`. If the API is unreachable or the user is not logged
in, the form silently falls back to the compile-time defaults.

### Follow-up form inherits previous session's harness/model
The follow-up form on the session detail page now defaults to the same harness
and model that was used for the most-recent agent run in that session (read from
the structured `section_start` events). This makes it easy to continue working
with the same agent configuration without accidentally switching harness
mid-session.

If the user changes harness/model in the follow-up form, the new selection is
saved to the database as usual, so it also becomes the new sticky default for
future new requests.

### Implementation details

**Database layer** (`lib/db/types.ts`, `lib/db/sqlite.ts`):
- New `user_preferences` table: `(user_id, key, value, updated_at, PRIMARY KEY (user_id, key))`
- Two new `DbAdapter` methods: `getUserPreferences(userId, keys[])` and `setUserPreferences(userId, prefs)`

**API** (`app/api/user/preferences/route.ts`):
- `GET ?keys=k1,k2` — returns `{ prefs: Record<string, string> }` for the current session user
- `PATCH` with body `{ prefs: Record<string, string> }` — upserts the given key-value pairs; 401 if unauthenticated

**Client** (`components/EvolveRequestForm.tsx`):
- Replaced localStorage helpers with `loadPreferences()` (async fetch on mount) and `savePreferences()` (fire-and-forget PATCH on change)
- Added `defaultHarness?` / `defaultModel?` props: when provided (e.g. from the follow-up form), the DB load is skipped for the initial render — the explicit default takes priority
- On submit reset, harness/model are left unchanged (they already reflect the user's preference in the DB)

**Session view** (`components/EvolveSessionView.tsx`):
- Computes `sessionHarness` / `sessionModel` by finding the last `section_start` event with `sectionType === 'agent'` and passes them as `defaultHarness` / `defaultModel` to the follow-up `EvolveRequestForm`

## Why
localStorage is per-browser and per-device, so switching browsers or devices
would lose the sticky preference. Storing it in the database means the setting
follows the logged-in user everywhere. Sessions should feel continuous: if you
started with Pi on one device, follow-ups on another device also default to Pi.
