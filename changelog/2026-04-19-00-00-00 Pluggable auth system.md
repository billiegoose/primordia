# Pluggable Auth System

## What changed

Refactored the authentication system from a monolithic login page into a **zero-registry plugin architecture** where each authentication mechanism is a fully self-contained unit that can be added, removed, or forked without touching any shared integration file.

### Directory structure

Each auth provider lives in three places that mirror each other by provider ID:

```
app/(auth-<id>)/          ← Next.js route group (API routes, optional pages)
lib/auth-providers/<id>/  ← Server-side descriptor (default-export AuthPlugin)
components/auth-tabs/<id>/← Client-side tab UI   (default-export ComponentType<AuthTabProps>)
```

Route groups use Next.js's `(name)` convention — they organize files without affecting URLs, so all existing `/api/auth/*` endpoints are unchanged.

### Provider directories

| Provider | Route group | Server descriptor | Client tab |
|---|---|---|---|
| exe.dev SSO | `app/(auth-exe-dev)/` | `lib/auth-providers/exe-dev/index.ts` | `components/auth-tabs/exe-dev/index.tsx` |
| Passkey | `app/(auth-passkey)/` | `lib/auth-providers/passkey/index.ts` | `components/auth-tabs/passkey/index.tsx` |
| QR cross-device | `app/(auth-cross-device)/` | `lib/auth-providers/cross-device/index.ts` | `components/auth-tabs/cross-device/index.tsx` |

The cross-device approve page (`/login/approve`) is also co-located inside `app/(auth-cross-device)/login/approve/page.tsx`.

### Interfaces (`lib/auth-providers/types.ts`)

```typescript
// Server-side descriptor — default export from lib/auth-providers/<id>/index.ts
interface AuthPlugin {
  id: string;       // matches directory name
  label: string;    // shown on the login tab
  getServerProps?: (ctx: AuthPluginServerContext) => Promise<Record<string, unknown>>;
}

// Client tab props — ComponentType<AuthTabProps> is the default export from
// components/auth-tabs/<id>/index.tsx
interface AuthTabProps {
  serverProps: Record<string, unknown>;
  nextUrl: string;
  onSuccess: (username: string) => void;
}
```

### Auto-discovery (zero registry)

`app/login/page.tsx` (server component) calls `fs.readdirSync('lib/auth-providers/')` at request time to discover installed providers — no registry file to maintain. For each discovered directory it dynamically imports the server descriptor, collects `getServerProps()` data, and passes the resolved list to the client.

`app/login/LoginClient.tsx` (client component) loads tab components via `next/dynamic` with a template-literal import path (`@/components/auth-tabs/${id}/index`). Webpack creates a context module at build time that bundles every installed tab component; the runtime ID selects the correct one. No `TAB_COMPONENT_MAP` to maintain.

### Deleted files

- `lib/auth-plugins/registry.ts` — replaced by filesystem auto-discovery
- `components/auth-tabs/index.tsx` — replaced by dynamic import
- `components/auth-tabs/types.ts` — merged into `lib/auth-providers/types.ts`
- `components/auth-tabs/PasskeyTab.tsx`, `ExeDevTab.tsx`, `CrossDeviceTab.tsx` — moved to `components/auth-tabs/<id>/index.tsx`
- `app/api/auth/{exe-dev,passkey,cross-device}/` — moved into route groups
- `app/login/approve/` — moved into `app/(auth-cross-device)/login/approve/`

## Why

The previous step (also on this branch) introduced two explicit registry files that callers had to edit when adding a plugin. The goals were good but the implementation still required touching shared files on every fork.

This step eliminates both registries:

1. **No server registry** — the login page discovers providers by reading the filesystem, so adding a provider means creating a directory, not editing a shared file.
2. **No client registry** — `next/dynamic` with a template-literal path causes webpack to include all matching tab components at build time; the plugin ID selects the right one at runtime.
3. **Route group co-location** — all files for one auth provider (API routes, server descriptor, client tab) share a common ID prefix, making it immediately obvious what belongs to what and minimising the diff when adding or removing a provider on a fork.

## How to add a new auth provider

1. Create `lib/auth-providers/<id>/index.ts` with a default-exported `AuthPlugin`
2. Create `components/auth-tabs/<id>/index.tsx` with a default-exported `ComponentType<AuthTabProps>`
3. Create API routes under `app/(auth-<id>)/api/auth/<id>/`

No other file needs to be touched.
