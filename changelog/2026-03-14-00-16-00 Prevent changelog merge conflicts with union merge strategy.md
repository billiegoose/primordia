Configured git to use the union merge strategy for `PRIMORDIA.md` to prevent conflicts when multiple PRs prepend changelog entries simultaneously.

**What changed**: Added `.gitattributes` with `PRIMORDIA.md merge=union`.

**Why**: Every PR that follows the "prepend a changelog entry" convention inserts new text at the same line in `PRIMORDIA.md`. When two PRs are open simultaneously, git sees two insertions at the same position and cannot auto-resolve them, producing a merge conflict on every merge. The `union` merge driver tells git to accept all lines from both sides without conflicting. Since each changelog entry is unique text, the merged result is always correct and ordering stays newest-first.
