# Fix unattached branch visibility on branches page and preview routing

## What changed

### `/branches` page — new "Other Branches" section

`buildSections()` previously only rendered branches that were reachable from the
production branch tree (either as descendants via the `branch.<name>.parent` git
config, or as ancestors in the blue-green promotion chain). Any branch with no
`parent` config — including manually created branches and worktrees — was fetched
from git but silently dropped from the UI.

`buildSections` now computes a `covered` set (everything reachable from the
production chain in either direction) and returns an `unattached` list of all
remaining branches. The page renders these in a new **Other Branches** section
below Past Sessions.

### Reverse proxy — branch-name routing for manual worktrees

`/preview/<id>` routing works by looking up the session ID in
`sessionWorktreeCache`, which is built exclusively from `branch.<name>.sessionid`
+ `branch.<name>.port` git config entries. A manually created worktree has neither
entry, so `/preview/cleanup-installer` (or any other manually created branch)
would silently fall through to production and return a 404.

`readAllPorts()` now adds a fallback entry to `sessionWorktreeCache` for every
branch that has a port configured (`branch.<name>.port`) and an active worktree,
but no `sessionid` git config. The branch name is used as the routing key, so
`/preview/<branchName>` routes correctly as long as `branch.<branchName>.port` is
set.

`sessionPortCache` (used for WebSocket / HMR upgrade routing) is also updated with
these branch-name entries so that hot-module-reload connections work correctly for
manual worktrees.

## Why

A developer created a worktree manually for the `cleanup-installer` branch (e.g.
`git worktree add ../cleanup-installer cleanup-installer` + setting a port in git
config) and expected:

1. The branch to appear on `/branches` — it didn't, because it had no `parent`
   config connecting it to the production tree.
2. The preview to be accessible at `/preview/cleanup-installer` — it wasn't,
   because the proxy only knew about sessions created by the evolve flow (which
   write `branch.<name>.sessionid` to git config).
