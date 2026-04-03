# Enable /branches page in production

## What changed

The `/branches` page was previously blocked in all non-development environments with a hard `NODE_ENV !== "development"` guard. That guard has been removed.

The page is now available in production (and all environments), protected by an **admin-only** gate:

- Unauthenticated users are redirected to `/login`.
- Logged-in non-admin users see the standard `ForbiddenPage` 403 with a description of what the page does, the conditions required, which ones they meet, and how to get access.
- Admin users see the full branch tree, evolve session statuses, preview server links, and diagnostics — exactly as before.

The legend text "Development mode only" in the page footer was updated to "Admin only".

The file-level comment and PRIMORDIA.md file map entry were updated to reflect the new access model.

## Why

The `/branches` page is one of Primordia's most useful features: it gives admins a live view of every evolve branch, its session status, and links to preview servers — all in one place. There was no technical reason to keep it dev-only; the underlying git commands and SQLite queries work identically in production. Restricting it to admins is appropriate since it exposes internal branch/session state.
