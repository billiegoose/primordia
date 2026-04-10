# Fix git worktree conflict when starting session on branch already in a worktree

## What changed

When a user clicked "+ session" on the Branches page for a branch that was already registered as a git worktree (e.g. `resizable-mobile-dialog` had a worktree at `/home/exedev/primordia-worktrees/resizable-mobile-dialog`), the evolve pipeline crashed with:

```
❌ Error: git worktree add failed:
fatal: 'resizable-mobile-dialog' is already used by worktree at '/home/exedev/primordia-worktrees/resizable-mobile-dialog'
```

This happened because `startLocalEvolve` (with `skipBranchCreation: true`) always ran `git worktree add <newPath> <branch>`, even when the branch was already checked out in an existing worktree.

## Fix

In `lib/evolve-sessions.ts`, added a `parseWorktreePathForBranch` helper that parses `git worktree list --porcelain` output to find an existing worktree for a given branch.

In the `skipBranchCreation` path of `startLocalEvolve`, before running `git worktree add`, the code now checks if the branch already has a registered worktree. If it does, it reuses that path (updating both `session.worktreePath` in memory and in SQLite) instead of attempting a new `git worktree add` that would fail.

The SQLite `updateEvolveSession` method in `lib/db/sqlite.ts` (and its type signature in `lib/db/types.ts`) was extended to support updating `worktreePath`, so the DB record stays consistent with the actual worktree path being used.

## Why

Old worktrees accumulate as accepted sessions are kept for rollback purposes. When a branch has been through a session before (or was set up as a worktree by another means), the `from-branch` flow was broken by the git conflict. This fix makes the flow idempotent with respect to pre-existing worktrees.
