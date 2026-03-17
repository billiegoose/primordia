When a PR already exists for an evolve issue, follow-up `@claude` comments are now posted to the PR instead of the issue.

**What changed**:
- `app/api/evolve/route.ts`: the `comment` action now checks for an open PR whose branch matches `claude/issue-{N}-*`. If found, the `@claude` follow-up comment is posted to the PR instead of the issue. Returns `prNumber`/`prUrl` in the response so the frontend can surface the right link.
- `app/api/evolve/status/route.ts`: when a matching PR is found and its comments are fetched (for the Vercel preview URL), also check for Claude's progress comment there — it will now live on the PR when the follow-up was posted to the PR.
- `components/ChatInterface.tsx`: confirmation message now says "comment on PR #N" vs "comment on Issue #N" depending on where the comment landed.

**Why**: When a PR already exists for an evolve issue, the active work is happening on that PR's branch. Commenting directly on the PR is clearer for the reviewer and means Claude Code's response appears right where the code changes are.
