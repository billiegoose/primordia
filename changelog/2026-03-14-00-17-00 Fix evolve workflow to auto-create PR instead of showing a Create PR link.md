Updated the evolve GitHub Actions workflow to automatically open a pull request after Claude Code finishes, instead of posting a "Create PR" link.

**What changed**: Added `id: claude` to the "Run Claude Code" step in `evolve.yml` and added a new "Create Pull Request" step after it. The new step runs only on `issues` events and only when the action produced a `branch_name` output. It calls `gh pr create` with a title derived from the issue title and a body that closes the originating issue.

**Why**: `anthropics/claude-code-action@v1` in interactive mode (triggered by `@claude` in an issue) creates a branch, commits changes, and pushes — but then posts a "Create PR" link in the issue comment rather than opening the PR automatically. The action exposes a `branch_name` output that the new post-step uses to call `gh pr create` directly, completing the pipeline end-to-end without manual intervention.
