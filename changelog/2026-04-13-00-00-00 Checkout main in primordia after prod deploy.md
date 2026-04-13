# Checkout `main` in `~/primordia` after prod deploy

## What changed

Added two steps at the end of `moveMainAndPush` in
`app/api/evolve/manage/route.ts`:

1. **Sync `origin/main` tracking ref** — when pushing via an authenticated
   URL (rather than a named remote), git does not update
   `refs/remotes/origin/main`. This caused `git status` in `~/primordia` to
   show "Your branch is ahead of 'origin/main' by N commits" until a
   `git fetch` was run manually. After a successful URL-based push,
   `git update-ref refs/remotes/origin/main refs/heads/main` is now called
   to sync the tracking ref without a network round-trip.

2. **`git checkout --force main`** — switches `~/primordia` to `main` after
   the pointer is moved. `--force` discards any local modifications so the
   checkout always succeeds.

Both steps are non-fatal: failures are logged as warnings (`⚠`) and do not
block the deploy from completing.

## Why

`~/primordia` is the primary git repo (all worktrees share its `.git`). It
was sitting on a detached HEAD or an old branch even after `main` was updated,
and `git status` there was misleadingly showing "ahead of origin/main" because
the remote-tracking ref wasn't updated when pushing via an explicit URL.
These two fixes keep `~/primordia` cleanly on `main` and in sync with the
remote after every prod deploy.
