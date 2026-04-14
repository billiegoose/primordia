# Replace GitHub sync with git mirror remote

## What changed

- **Removed** the "Sync with GitHub" hamburger menu item from all pages (chat, evolve, evolve session, changelog, branches, admin).
- **Removed** `components/GitSyncDialog.tsx` and `app/api/git-sync/route.ts` entirely. The git-sync flow relied on `GITHUB_TOKEN` and `GITHUB_REPO` environment variables.
- **Removed** `GITHUB_TOKEN` and `GITHUB_REPO` from the documented environment variables (they are no longer used anywhere).
- **Modified** `moveMainAndPush()` in `app/api/evolve/manage/route.ts`: instead of building an authenticated GitHub HTTPS URL from env vars and pushing `main:main` to it, the deploy pipeline now checks whether a git remote named `mirror` exists in the repo. If it does, it runs `git push mirror` after advancing the main branch pointer. If not, no external push happens — the deploy completes without error.
- **Added** `/admin/git-mirror` page (`app/admin/git-mirror/page.tsx` + `components/GitMirrorClient.tsx`): an admin-only panel that shows whether the `mirror` remote is currently configured (with its URL) and provides step-by-step SSH instructions for adding it, including a copyable `git remote add --mirror=push mirror <url>` command.
- **Updated** `AdminSubNav` to include the new "Git Mirror" tab.

## Why

The previous "Sync with GitHub" approach required storing a `GITHUB_TOKEN` personal access token and `GITHUB_REPO` slug as environment variables, and was a bidirectional pull+push that could cause merge conflicts. It was complex, fragile, and tightly coupled to GitHub.

The new mirror approach is simpler and more robust:
- The admin adds the mirror remote once via SSH (a one-time setup). No secrets need to be stored in environment variables.
- The mirror URL can point to any git host (GitHub, Gitea, Forgejo, the exe.dev built-in Gitea, etc.).
- Using `--mirror=push` means all refs are pushed automatically, not just `main`.
- The push is fire-and-forget on each production deploy — if it fails it logs a warning but never blocks the deploy.
- No GITHUB_TOKEN, no GITHUB_REPO, no complexity around pull conflicts.
