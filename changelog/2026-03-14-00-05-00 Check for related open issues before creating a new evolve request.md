Search for existing open evolve issues before creating a new one, and allow posting follow-up comments on them.

**What changed**:
- `/api/evolve/route.ts` now supports three actions: `search` (find open evolve issues via GitHub Search API), `comment` (add a `@claude` follow-up comment to an existing issue), and `create` (existing behavior, now explicit). The `comment` action returns `issueNumber` so the frontend can start CI polling.
- `components/ChatInterface.tsx`: on evolve submit, the app searches for open evolve issues first. If any are found, a **decision card** lists them with an "Add comment" button per issue and a "Create new issue instead" fallback. After posting a comment on an existing issue, the same live CI-progress polling starts (identical to the new-issue path), so users see Claude's task-list updating in real time. `EvolveResult` type updated to support both `"created"` and `"commented"` outcomes.

**Why**: Avoid unnecessary issue/branch proliferation; follow-up requests should continue on the existing branch. The live comment display was already present for new issues — now it works for follow-ups too.
