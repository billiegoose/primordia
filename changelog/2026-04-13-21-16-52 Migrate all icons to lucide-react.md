# Migrate all icons to lucide-react

## What changed

Audited every icon in the codebase and replaced all non-Lucide icons with their `lucide-react` equivalents. Added `lucide-react` as a dependency.

### Files updated

- **`app/page.tsx`** — replaced 6 inline SVGs with `MessageSquare`, `RefreshCw`, `GitBranch`, `ArrowRight`, `Edit`, `ChevronDown`
- **`app/login/LoginClient.tsx`** — replaced custom `KeyIcon` (SVG key) with `Key` and `ExeDevIcon` (chevron-right prompt) with `ChevronRight`; removed both local function definitions
- **`app/login/approve/page.tsx`** — replaced custom `CheckIcon` with `Check`; removed local function definition
- **`components/CopyButton.tsx`** — replaced inline checkmark and copy SVGs with `Check` and `Copy`
- **`components/HamburgerMenu.tsx`** — replaced 9 inline SVGs with `MessageSquare`, `Edit`, `CloudUpload`, `Shield`, `Terminal`, `X`, `Menu`, `LogOut`, `LogIn`
- **`components/LandingNav.tsx`** — replaced inline X and hamburger SVGs with `X` and `Menu`
- **`components/EvolveRequestForm.tsx`** — replaced Heroicons-sourced filled Settings gear and ChevronDown SVGs (and inline Paperclip) with `Settings`, `ChevronDown`, `Paperclip`
- **`components/EvolveSessionView.tsx`** — replaced inline git-branch SVG with `GitBranch`
- **`components/PruneBranchesButton.tsx`** — replaced inline trash SVG with `Trash2`
- **`components/PruneBranchesDialog.tsx`** — replaced inline trash SVG with `Trash2`
- **`components/GitSyncDialog.tsx`** — replaced inline cloud-upload SVG with `CloudUpload`
- **`components/StreamingDialog.tsx`** — replaced inline X SVG with `X`
- **`components/FloatingEvolveDialog.tsx`** — replaced custom 12×12 viewBox X SVG with `X`

### What was intentionally left unchanged

- **`components/FloatingEvolveDialog.tsx` `DockIcon`** — fully custom corner-position indicator (filled square inside a box); no Lucide equivalent
- **Emoji in API routes and server-side streaming** (`app/api/`, `lib/evolve-sessions.ts`, etc.) — these are terminal/streaming text output, not UI icons

## Why

All icons in the codebase were hand-coded inline SVGs, with two exceptions that were borrowed from Heroicons (filled-style `Settings` gear and `ChevronDown` in `EvolveRequestForm`). Using `lucide-react` instead:

- Eliminates duplicated SVG markup across 13+ files
- Ensures visual consistency across all icons (same stroke width defaults, same viewBox, same rendering style)
- Removes the two Heroicons outliers (filled/solid style) in favour of the stroke-based Lucide style used everywhere else
- Aligns with the Lucide preference documented in CLAUDE.md/README
