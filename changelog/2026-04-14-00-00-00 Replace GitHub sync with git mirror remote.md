# Replace GitHub sync with git mirror remote

## What changed

- **Removed** the "Sync with GitHub" hamburger menu item from all pages (chat, evolve, evolve session, changelog, branches, admin).
- **Removed** `components/GitSyncDialog.tsx` and `app/api/git-sync/route.ts` entirely. The git-sync flow relied on `GITHUB_TOKEN` and `GITHUB_REPO` environment variables.
- **Removed** `GITHUB_TOKEN` and `GITHUB_REPO` from the documented environment variables (they are no longer used anywhere).
- **Modified** `moveMainAndPush()` in `app/api/evolve/manage/route.ts`: instead of building an authenticated GitHub HTTPS URL from env vars and pushing `main:main` to it, the deploy pipeline now checks whether a git remote named `mirror` exists in the repo. If it does, it runs `git push mirror` after advancing the main branch pointer. If not, no external push happens — the deploy completes without error.
- **Added** `/admin/git-mirror` page (`app/admin/git-mirror/page.tsx` + `components/GitMirrorClient.tsx`): an admin-only panel where admins can configure the mirror remote entirely from the browser — no SSH required.
  - A URL input + "Set mirror" button runs `git remote add --mirror=push mirror <url>` and an initial `git push mirror` on the server to verify the connection.
  - A "Remove mirror" button runs `git remote remove mirror`.
  - Instructions guide the user through creating a GitHub repo, setting up the [exe.dev GitHub Integration](https://exe.dev/docs/integrations-github.md) to get an authenticated push URL, and pasting it into the form.
- **Added** `app/api/admin/git-mirror/route.ts`: `POST` adds/updates the mirror remote and does an initial push; `DELETE` removes it. Admin-only.
- **Updated** `AdminSubNav` to include the new "Git Mirror" tab.

## Why

The previous "Sync with GitHub" approach required storing a `GITHUB_TOKEN` personal access token and `GITHUB_REPO` slug as environment variables, and was a bidirectional pull+push that could cause merge conflicts. It was complex, fragile, and tightly coupled to GitHub.

The new mirror approach is simpler and more robust:
- The admin configures the mirror once from the browser UI — no SSH needed.
- Uses the exe.dev GitHub Integration for authenticated push URLs; no tokens stored in env vars.
- `--mirror=push` pushes all refs automatically, not just `main`.
- The push is fire-and-forget on each production deploy — if it fails it logs a warning but never blocks the deploy.
