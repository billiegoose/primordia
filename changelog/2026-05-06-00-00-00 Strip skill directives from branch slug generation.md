# Strip skill directives from branch slug generation

## What changed

Before generating a branch name / session ID, the evolve API (`app/api/evolve/route.ts`) now strips the first line of the request text if it begins with a known skill slash-command (e.g. `/caveman full`, `/caveman ultra`).

Added:
- `SKILL_PREFIXES` constant listing known skill commands (`/caveman`, `/using-exe-dev`).
- `stripSkillDirective(text)` helper that removes the first line when it matches a skill prefix, falling back to the full text if nothing remains.
- Call to `stripSkillDirective` wrapping `requestText` before passing it to `generateSlug`.

## Why

When a user prefixes their request with `/caveman full` (or similar), the Claude Haiku slug-generator would incorporate "caveman" into the branch name — producing useless names like `caveman-full-add-dark-mode` instead of `add-dark-mode`. Stripping the directive line before slugging gives clean, meaningful branch names regardless of which skill is active.
