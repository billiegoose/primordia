# Switch dependency management to pnpm behind sfw

Primordia now uses pnpm for dependency management while continuing to use bun as the JavaScript/TypeScript runtime.

What changed:

- `package.json` now declares `pnpm@10.11.0` as the package manager.
- Added `pnpm-lock.yaml` and removed `bun.lock` so dependency resolution is owned by pnpm.
- Installer dependency installs now run as `sfw pnpm install --frozen-lockfile`.
- Evolve worktree setup and legacy accept dependency refreshes now run `sfw pnpm install` instead of `bun install`.
- Preview and production app scripts are started with `pnpm run dev` / `pnpm run start`; the scripts themselves still invoke bun as the runtime for Next.js.
- The installer creates guarded `bun`/`bunx` shims. Runtime-oriented bun commands still work, but package-manager commands such as `bun install`, `bun add`, `bun update`, `bun x`, `bun create`, `bun dlx`, and `bunx` fail with guidance to use pnpm through Socket Firewall.
- The installer adds a `pnx` helper (`pnpm dlx`) intended to be used as `sfw pnx ...` for one-off package binaries.
- Root project guidance now tells agents to use `sfw pnpm` for dependency changes and `sfw pnx` for one-off package execution.

Why:

pnpm provides stronger supply-chain safety defaults and a stricter dependency model than bun's package manager. Requiring package downloads to go through both pnpm and Socket Firewall keeps dependency changes auditable and filtered, while still preserving bun's runtime performance for application code.
