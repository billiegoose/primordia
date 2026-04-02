# Admin permission grants, RBAC roles, and 403 access-denied pages

## What changed

### RBAC (role-based access control)

Replaced the flat `user_permissions` table with a proper (but simple) RBAC system:

- **`roles` table** — catalog of named roles with descriptions. Seeded at boot with two built-in roles:
  - `admin` — full system access; automatically granted to the first user who registers
  - `can_evolve` — allows a user to submit change requests via the evolve flow

- **`user_roles` table** — maps users to roles (`user_id`, `role_name`, `granted_by`, `granted_at`). Replaces the old `user_permissions` table; existing `user_permissions` rows are automatically migrated on first boot.

- **Bootstrap** — the first user to register (passkey or exe.dev) is granted the `admin` role immediately. On DB startup, any pre-existing first user without the role is backfilled.

- **Auth helpers updated** — `isAdmin(userId)` now checks for the `admin` role (previously checked first-user by `created_at`). `hasEvolvePermission(userId)` checks for `admin` or `can_evolve` role.

- **Admin API updated** — `POST /api/admin/permissions` now accepts `{ userId, role, action }` instead of `{ userId, permission, action }`. Only grantable roles (`can_evolve`) are accepted; `admin` cannot be delegated via the API.

### 403 access-denied pages (best practice)

Protected routes no longer silently redirect to `/chat` when a logged-in user lacks permissions. Instead they render `<ForbiddenPage>`, which shows:

1. A brief description of what the page does (so the user knows if they even want access)
2. The full list of conditions required to access the page
3. Which conditions the user currently meets (green ✓) and doesn't meet (red ✗)
4. How to gain the missing access

This pattern is documented in PRIMORDIA.md as a design principle: unauthenticated users (no session) are still redirected to `/login`; authenticated users lacking a role see the 403 page.

- `components/ForbiddenPage.tsx` — new reusable server component
- `app/evolve/page.tsx` — renders ForbiddenPage for users without `admin` or `can_evolve` role
- `app/admin/page.tsx` — renders ForbiddenPage for users without `admin` role

## Why

The flat `user_permissions` approach worked for a single permission but didn't scale cleanly to multiple access levels. A roles table is the standard pattern and makes the system easier to extend (e.g., adding a `can_chat` role later). The silent redirect to `/chat` was also confusing — users had no idea why they were bounced or what they'd need to do to get access.
