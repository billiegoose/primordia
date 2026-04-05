# Fix clone URL by making GIT_DIR absolute

## What changed

- **`app/api/git/[...path]/route.ts`**: `resolveGitDir()` now wraps the result of `git rev-parse --git-common-dir` with `path.resolve(process.cwd(), result)` so `GIT_DIR` is always an absolute path. Previously, when running from the main repo (not a worktree), `git rev-parse --git-common-dir` returned `.git` (relative), which could confuse `git http-backend` if its working directory ever differed from `process.cwd()`.

- **`app/branches/page.tsx`**: Added the clone URL (`<host>/api/git`) to the legend section so users can see the correct URL to use.

## Why

`git clone https://primordia.exe.xyz/api/git` was not working. The root cause was that `GIT_DIR` could be set to a relative path (`.git`) when the process runs from the main repo rather than a worktree. The CGI spec and git http-backend both work most reliably with absolute paths for `GIT_DIR`. Making it absolute ensures git http-backend can always locate the object store, regardless of process working directory.

The clone URL (`https://primordia.exe.xyz/api/git`) is correct and is now surfaced on the branches page.
