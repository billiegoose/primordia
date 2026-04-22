# Add instance identity and social graph

## What changed

- **Instance identity** — each Primordia instance now has a fixed UUID v7 (generated once on first boot and stored in SQLite), plus an editable `name` and `description`.
- **`/.well-known/primordia.json`** — new endpoint (served via a Next.js rewrite from `/api/instance/primordia-json`) that returns a structured JSON document describing this instance and its known peer network:
  - `$schema`, `canonical_url`, `name`, `description`, `source` (git URL), `uuid7`
  - `nodes[]` — self + all registered peer instances
  - `edges[]` — directed relationships (type `child_of`: child → parent) between instances
  - `meta.generated_at` — ISO timestamp
- **`POST /api/instance/register`** — public endpoint for child instances to register themselves; validates UUID v7 format + URL; creates/updates a graph node and inserts a `child_of` edge (child → parent, i.e. `from` = child uuid7, `to` = this instance's uuid7).
- **`GET /PATCH /api/instance/config`** — admin-only endpoint to read and update instance name/description.
- **Admin panel `/admin/instance`** — new tab in the admin subnav; shows the UUID v7 (read-only), editable name/description fields, a list of known peer nodes, a table of graph edges, and copy-paste instructions for registering a child instance.
- **`lib/uuid7.ts`** — thin re-export of `uuid.v7()` from the `uuid` npm package (replaces the earlier homebrew implementation).
- **`/schemas/instance/v1.json`** — serves the canonical JSON Schema (draft 2020-12) for the instance manifest; includes `uuid7` as a required top-level field alongside `$schema` and `canonical_url`; `$id` is `https://primordia.app/schemas/instance/v1.json`.
- **`PRIMORDIA_CANONICAL_URL`** env var — optional; used as the base URL in the well-known JSON; falls back to deriving from request headers if unset. Required if `PRIMORDIA_PARENT_URL` is set.
- **`PRIMORDIA_PARENT_URL`** env var — optional; when set, this instance POSTs its own identity to `{PRIMORDIA_PARENT_URL}/api/instance/register` at startup via the Next.js `instrumentation.ts` hook, so the parent automatically learns about this child.
- **`instrumentation.ts`** — Next.js server instrumentation file; registers with the parent instance on startup if both `PRIMORDIA_PARENT_URL` and `PRIMORDIA_CANONICAL_URL` are configured.
- `$schema` URL updated to `https://primordia.app/schemas/instance/v1.json` throughout.
- Edge type simplified: only `child_of` is documented as a known type (speculative types removed from schema).
- **DB tables** — `instance_config` (key/value), `graph_nodes`, `graph_edges` added to the SQLite schema with idempotent `CREATE TABLE IF NOT EXISTS` migrations.

## Why

Primordia instances need a stable identity and a way to discover each other to form a decentralised social network graph. This lays the foundation: each instance self-describes at a well-known URL, and instances can announce themselves to peers via the register endpoint.
