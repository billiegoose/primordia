Changed the PR merge strategy from squash to regular merge commit.

**What changed**: `app/api/merge-pr/route.ts`: changed `merge_method` from `"squash"` to `"merge"` in the GitHub API call.

**Why**: User requested regular merge commits instead of squash merges to preserve individual commit history from the PR branch.
