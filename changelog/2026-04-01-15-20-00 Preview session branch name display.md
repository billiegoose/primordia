# Preview: Session Branch Name Display

This branch is a no-op preview worktree to view the session page after the change introduced in the previous commit.

## What changed (in the commit being previewed)

- Added a `Branch: <name>` label at the **top** of the evolve session page (below the session header)
- Added a `Branch: <name>` label at the **bottom** of the evolve session page (above the accept/reject bar)

## Why

Makes it immediately clear which branch a session belongs to without having to scroll or dig into logs. Useful when multiple session tabs are open or when sharing a session link.
