# Guard against concurrent prod deploys

## What changed

- **`lib/evolve-sessions.ts`**: Added `'accepting'` to the `LocalSessionStatus` union type. It was already being written to SQLite by the manage route but was missing from the type definition.

- **`app/api/evolve/manage/route.ts`**: Added Gate 3 — a concurrent-deploy guard — immediately before `runAcceptAsync` is kicked off. After Gates 1 (ancestor check) and 2 (clean worktree), the handler now queries all evolve sessions and returns **409 Conflict** if any other session has `status === 'accepting'`. The 409 body includes the branch name of the in-progress deploy so the user knows what to wait for.

- **`PRIMORDIA.md`**: Updated the session state machine reference to formally document `accepting` as a status, explain the 409 semantics, and add the `ready → accepting → accepted/ready(error)` transition rows.

## Why

**The race condition:** Two users (or one user with two browser tabs) could click Accept on two different `ready` sessions at roughly the same time. Both sessions would pass Gates 1 and 2 synchronously, both would set their status to `accepting`, and both would eventually call `spawnProdViaProxy`. The second call to the proxy would overwrite the first deploy: it would set `primordia.productionBranch` to the second session's branch, which was built from the **old** production code (not from the first deploy). The net effect is that the first deploy's changes are silently discarded.

**What about Claude Code running on other sessions?** Sessions in `running-claude` (or `fixing-types`) status during a prod deploy are **neither terminated nor orphaned**. They continue running completely unaffected in their own isolated worktrees — the deploy only touches the accepting session's worktree and git config. `reparentSiblings` updates the git config `branch.{X}.parent` of any sibling sessions to point at the newly deployed branch, so when those sessions eventually reach `ready` the upstream changes indicator shows how many commits the new production is ahead of them. Gate 1 (ancestor check) then prevents accept until the user clicks "Apply Updates" (merge/rebase). The existing state machine already handles this path correctly; no changes were needed for the running-session case.

**Why a 409 (not a lock)?** A full distributed lock would add complexity for a single-process app. Since `bun:sqlite` queries run on the same thread and the `accepting` status is written atomically before the async work starts, a simple "any session in `accepting`?" check is sufficient to block the common cases: accidental concurrent accepts from two browser sessions, or a second accept submitted before the first deploy finishes (which takes ~60–90 s for typecheck + build + proxy spawn).
