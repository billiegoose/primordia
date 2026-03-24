# Shorten file paths in Claude Code progress

## What changed

Modified `summarizeToolUse` in `lib/local-evolve-sessions.ts` to strip the absolute worktree
directory prefix from file paths shown in progress messages, replacing it with `./`.

Before:
```
- 🔧 Read `/Users/billie/code/billiegoose/primordia-worktrees/shorten-file-paths/PRIMORDIA.md`
```

After:
```
- 🔧 Read `./PRIMORDIA.md`
```

## Why

Full absolute paths in progress output were noisy and unhelpful — they exposed internal machine
directory structure and made the progress log harder to scan. Relative paths anchored to the
worktree root (`./`) are shorter, easier to read, and just as informative.

## How

- `summarizeToolUse` now accepts an optional third parameter `worktreePath`.
- A `shortenPath` helper strips the worktree prefix from any `file_path`/`path` value before
  rendering it.
- Both call sites (`startLocalEvolve` and `resolveConflictsWithClaude`) now pass the relevant
  root path (`session.worktreePath` and `mergeRoot` respectively).
