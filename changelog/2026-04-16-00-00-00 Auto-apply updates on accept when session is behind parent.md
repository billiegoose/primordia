# Auto-apply updates on accept when session is behind parent

## What changed

When accepting a session whose branch is not up-to-date with its parent branch, the
`POST /api/evolve/manage` (accept action) now automatically merges the parent branch into
the session branch instead of returning a 400 error asking the user to do it manually.

If the merge produces conflicts, the existing Claude-based auto-resolution path
(`resolveConflictsWithClaude`) is invoked. If that also fails, a descriptive error is
returned and the merge is aborted — same as upstream-sync does today.

## Why

The previous Gate 1 failure message told users to click "Apply Updates" on the session
page before retrying accept. That extra step is unnecessary friction; the accept flow
already has all the context needed to perform the merge itself.
