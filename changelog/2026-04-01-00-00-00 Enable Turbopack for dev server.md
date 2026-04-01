# Enable Turbopack for dev server

## What changed

- **`package.json`** — Added `--turbopack` flag to the `dev` script so `next dev` uses Turbopack instead of the default webpack-based dev compiler.
- **`next.config.ts`** — Added a `turbopack.resolveAlias` block that passes `bun:sqlite` through as-is, mirroring the existing `webpack.externals` entry. Turbopack does not read `webpack` config, so the external had to be declared separately.

## Why

Turbopack is Next.js's Rust-based dev-mode bundler that provides significantly faster cold starts and incremental rebuilds compared to the webpack dev compiler. Since Primordia is hosted on `exe.dev` and iterated on heavily via the evolve pipeline, faster dev-server startup translates directly into quicker preview turnarounds.

The `bun:sqlite` alias is needed because the module is a Bun built-in (like `node:*` built-ins) that must never be bundled — it is only available at runtime in the Bun process. Without the alias, Turbopack could fail to resolve it during module graph analysis.

The existing `webpack` config and `next build` path are unchanged — Turbopack only applies to `next dev`.
