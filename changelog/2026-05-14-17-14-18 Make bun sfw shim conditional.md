# Make bun sfw shim conditional

Updated the installer-generated bun shim so it only routes package-downloading commands through sfw: `bun add`, `bun install`, `bun update`, `bun x`, `bun create`, `bun dlx`, and `bunx`.

Non-downloading commands now execute the real bun binary directly through the shim, so app runtime commands such as `bun run`, production proxy startup, builds, and dev server startup no longer need to call `bun-real` explicitly.

This keeps sfw protection where package downloads and install scripts are most relevant while avoiding unintended network filtering for long-running application processes.
