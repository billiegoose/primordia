# Replace PROD git symbolic-ref with git config for production branch tracking

## What changed

Replaced the `git symbolic-ref PROD` mechanism with two git config entries:

- **`primordia.productionBranch`** — the name of the currently active production branch (replaces reading `git symbolic-ref --short PROD`)
- **`primordia.productionHistory`** — an append-only ordered list of all branches that have ever been production, oldest-first (replaces the PROD symbolic-ref reflog for deep rollback)

Every place that previously wrote `git symbolic-ref PROD refs/heads/<branch>` now instead runs:
```
git config primordia.productionBranch <branch>
git config --add primordia.productionHistory <branch>
```

Every place that previously read `git symbolic-ref --short PROD` now runs:
```
git config --get primordia.productionBranch
```

The deep rollback (previously used `git log -g --format=%H PROD` to walk the PROD reflog) now reads `git config --get-all primordia.productionHistory`, reverses the list (newest-first), and matches entries by branch name against registered worktrees. The fast rollback (previously used `PROD@{1}` to find the second-to-last production state) now reads the second entry in the reversed history list.

## Files changed

- **`scripts/install-service.sh`** — on first install, sets `primordia.productionBranch main` and adds `main` to `primordia.productionHistory` instead of `git symbolic-ref PROD refs/heads/main`
- **`scripts/reverse-proxy.ts`** — reads `primordia.productionBranch` from git config; removed `setupProdWatch()` and the `.git/PROD` file watch (no longer needed); removed `watchedProdPath` variable
- **`scripts/rollback.ts`** — reads current branch from `primordia.productionBranch`; finds previous branch via `primordia.productionHistory`; updates both on rollback
- **`app/api/evolve/manage/route.ts`** — `blueGreenAccept` reads current prod branch from git config; `scheduleSlotActivation` writes both `primordia.productionBranch` and appends to `primordia.productionHistory` on accept
- **`app/api/rollback/route.ts`** — `findCurrentAndPrevious` reads current branch from git config and previous branch from production history; both writes updated to use git config
- **`app/api/admin/rollback/route.ts`** — GET endpoint reads production history (replaces PROD reflog walk); POST endpoint writes git config instead of symbolic-ref; simplified old-upstream-port reading by reusing already-known `currentProdBranch`
- **`PRIMORDIA.md`** — updated all references from PROD symbolic-ref to git config

## Why

The git symbolic-ref `PROD` worked fine in the main repo but broke down with git worktrees: each worktree shares the same `.git` directory (via `--git-common-dir`), and git refuses to check out a branch that is already checked out in another worktree — even for a symbolic ref. This made the PROD ref unreliable in multi-worktree deployments.

Since the branch→port mapping was already stored in git config (`branch.{name}.port`), storing the production branch name there too (`primordia.productionBranch`) is consistent, worktree-safe, and requires no special git ref handling. The history list (`primordia.productionHistory`) replaces the implicit history that the symbolic-ref reflog provided, making the rollback mechanism explicit and straightforward.
