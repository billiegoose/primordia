# Human-readable worktree and branch names using mnemonic-id

## What changed

- Installed `mnemonic-id` (v4.1.0) as a dependency.
- Local evolve sessions now generate names using a slugified description of the
  change request combined with a `createNameId()` mnemonic (e.g.
  `add-dark-mode-toggle-ancient-fireant`).
- **Worktrees** are created inside a shared `primordia-worktrees/` sibling
  directory instead of cluttering the parent folder with flat
  `primordia-preview-*` entries: `../primordia-worktrees/{slug}-{mnemonicId}`.
- **Branch names** now follow the `evolve/{slug}-{mnemonicId}` convention,
  consistent with what the GitHub Actions CI workflow uses for production
  evolve branches.
- Updated `PRIMORDIA.md` data flow section to reflect the new naming scheme.

## Why

The old timestamp-based names (`primordia-preview-1773955187463`) were opaque
and created 18+ sibling folders directly in the parent directory. The new
pattern is human-readable at a glance, groups all worktrees under one folder,
and aligns local branch names with the CI convention.
