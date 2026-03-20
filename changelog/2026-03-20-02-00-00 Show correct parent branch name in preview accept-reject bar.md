# Show correct parent branch name in preview accept-reject bar

## What changed

The accept/reject bar shown in local preview instances previously hardcoded the
branch name `main` in two places:

- "Accepting will merge the preview branch into `main`."
- "✅ Changes accepted and merged into main."

Both now display the **actual parent branch name** (e.g. `feature/my-branch`)
resolved at runtime.

## How it works

- `GET /api/evolve/local/manage` now returns `parentBranch` alongside `isPreview`
  and `branch`. The value comes from `getPreviewInfo()`, which already read it
  from `git config branch.<name>.parent` — it just wasn't being surfaced to the
  client before.
- `ChatInterface.tsx` stores the value in a new `previewParentBranch` state
  variable (defaulting to `"main"` for safety) and renders it in both the
  description line and the post-accept success message.
