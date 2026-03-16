Added an auto-generated changelog page driven by git history.

**What changed**:
- `scripts/generate-changelog.mjs` (new): prebuild/predev script that deepens shallow clones with `git fetch --deepen=300 --filter=tree:0` (fetches only commit objects, no blobs or trees), then writes the last 300 commits as structured JSON to `public/changelog.json`.
- `package.json`: added `prebuild` and `predev` scripts that run `generate-changelog.mjs` automatically before every build and local dev start.
- `app/changelog/page.tsx` (new): Next.js Server Component at `/changelog` that reads `public/changelog.json` at render time and displays commits in a chronological list (date, message, author, linked short hash).
- `components/ChatInterface.tsx`: added a "Changelog" link in the subtitle below the "Primordia" heading.
- `.gitignore`: added `public/changelog.json` — it's a build artifact and should not be committed to git.

**Why**: The manual changelog in PRIMORDIA.md was causing merge conflicts on every PR because GitHub doesn't honour `.gitattributes` union-merge directives. Generating the changelog from git history at build time eliminates the manual step entirely, gives users a richer commit-level history view in the app, and keeps the file out of version control.

**Note**: This approach was later superseded by the file-based changelog (see next entry) because git commit messages lack the detail of the PRIMORDIA.md entries.
