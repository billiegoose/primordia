# Sticky harness and model defaults for evolve forms

## What changed

### Sticky preference across new requests
The user's chosen harness and model are persisted to the database so the form
pre-selects the same agent configuration on the next visit — across browsers
and devices.

**How it is saved:** The preference is written server-side in `POST /api/evolve`
the moment a new evolve request is submitted. No extra round-trip is made from
the client; the harness and model are already in the request body.

**How it is loaded:** Each server component page that can show the evolve form
(the `/evolve` page, `/chat`, `/evolve/session/[id]`, and every page that has
a PageNavBar with the hamburger menu) calls `getEvolvePrefs(userId)` at render
time and threads the result down as `initialHarness` / `initialModel` props.
No REST endpoint is needed for reading; it is plain server-side data fetching.

### Follow-up form inherits previous session's harness/model
The follow-up form on the session detail page defaults to the same harness
and model that was used for the most-recent agent run in that session. This
is derived from the structured `section_start` events already present in the
streamed event list, and passed as `defaultHarness` / `defaultModel` props
(separate from `initialHarness` / `initialModel` so they are not confused).

The follow-up form does **not** save preferences on submit — only the top-level
new-request form does.

### Implementation details

**Database layer** (`lib/db/types.ts`, `lib/db/sqlite.ts`):
- New `user_preferences` table: `(user_id, key, value, updated_at, PRIMARY KEY (user_id, key))`
- Two new `DbAdapter` methods: `getUserPreferences(userId, keys[])` and `setUserPreferences(userId, prefs)`

**Server-side helpers** (`lib/user-prefs.ts`):
- `getEvolvePrefs(userId)` — reads `evolve:preferred-harness` and
  `evolve:preferred-model` from the DB, validates against known options,
  falls back to compile-time defaults. Safe to call in any server component.

**Preference save** (`app/api/evolve/route.ts`):
- Fire-and-forget `db.setUserPreferences()` call at the end of the POST
  handler, after the session is already created. Failure is silently ignored.

**Component chain** (`EvolveForm`, `FloatingEvolveDialog`, `ChatInterface`,
`EvolveSessionView`, `PageNavBar`):
- All accept `initialHarness?: string` / `initialModel?: string` props and
  forward them to `EvolveRequestForm`.

**`EvolveRequestForm`**:
- Accepts `initialHarness` / `initialModel` (sticky, from server-side load)
  and `defaultHarness` / `defaultModel` (session override for follow-ups).
- Initial state priority: `defaultHarness ?? initialHarness ?? DEFAULT_HARNESS`.
- Contains no fetch logic — entirely driven by props and compile-time defaults.
- On harness/model change in the Advanced panel: state only, no side effects.

**Server pages updated** (`app/evolve/page.tsx`, `app/chat/page.tsx`,
`app/evolve/session/[id]/page.tsx`, `app/changelog/page.tsx`,
`app/branches/page.tsx`, `app/oops/page.tsx`, `app/admin/page.tsx` and all
five admin sub-pages): each calls `getEvolvePrefs()` and passes the result
into the component tree.

## Why
- Storing in the DB (vs localStorage) means the preference follows the user
  across browsers and devices.
- Loading at page render time (vs a client-side fetch on mount) means there
  is no flicker: the correct agent is selected from the very first render.
- Saving only on submit (vs on every dropdown change) avoids noisy writes for
  users who are just exploring the Advanced panel without committing.
- Keeping follow-up forms separate from preference persistence means that
  switching agent mid-session is a deliberate act, not an accident caused by
  the form resetting to the wrong default.
