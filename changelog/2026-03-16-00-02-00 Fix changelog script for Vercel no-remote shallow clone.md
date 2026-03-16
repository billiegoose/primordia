Fixed the changelog generation script to handle Vercel's shallow clone environment which has no git remote configured.

**What changed**: `scripts/generate-changelog.mjs`: replaced the single `git fetch --deepen` block with a branch on `process.env.VERCEL`. In Vercel builds, the script now constructs the public HTTPS clone URL from `VERCEL_GIT_REPO_OWNER`/`VERCEL_GIT_REPO_SLUG` and runs `git pull --unshallow <url> "main:<ref>"` (per the [Vercel community workaround](https://github.com/vercel/vercel/discussions/5737#discussioncomment-7984929)). Non-Vercel environments (GitHub Actions, local dev) continue to use `git fetch --deepen=300 --filter=tree:0` as before.

**Why**: Vercel's build environment performs a shallow clone *without* configuring a remote, so `git fetch --deepen` always fails with "no remote". Detecting `VERCEL=1` and using a direct HTTPS pull unshallows the history without requiring a configured remote.

**Note**: This fix was for the git-based changelog approach, which was subsequently replaced by the file-based changelog system.
