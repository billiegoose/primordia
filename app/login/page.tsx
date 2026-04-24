// app/login/page.tsx — Server component: auto-discovers installed auth providers
// by scanning lib/auth-providers/, collects per-provider server props, then
// delegates to the client-side login UI.
//
// To add a new auth provider, no changes are needed here — just create:
//   lib/auth-providers/<id>/index.ts   (default export: AuthPlugin)
//   components/auth-tabs/<id>/index.tsx (default export: ComponentType<AuthTabProps>)

import { readdirSync } from "fs";
import path from "path";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import type { AuthPlugin, InstalledPlugin } from "@/lib/auth-providers/types";
import LoginClient from "./LoginClient";
import { buildPageTitle } from "@/lib/page-title";

export function generateMetadata(): Metadata {
  return { title: buildPageTitle("Login") };
}

/**
 * Scan lib/auth-providers/ and dynamically import each provider's descriptor.
 * Providers are sorted alphabetically by directory name for a stable tab order.
 */
async function discoverProviders(
  ctx: { headers: { get(name: string): string | null } }
): Promise<InstalledPlugin[]> {
  const dir = path.join(process.cwd(), "lib", "auth-providers");

  const ids = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();

  return Promise.all(
    ids.map(async (id) => {
      // Dynamic import — webpack creates a context module that bundles all
      // lib/auth-providers/*/index files at build time.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import(`@/lib/auth-providers/${id}/index`)) as any;
      const plugin: AuthPlugin = mod.default ?? mod;
      const serverProps = plugin.getServerProps
        ? await plugin.getServerProps(ctx)
        : {};
      return { id: plugin.id, label: plugin.label, serverProps };
    })
  );
}

export default async function LoginPage() {
  const user = await getSessionUser();
  const initialUser = user ? { id: user.id, username: user.username } : null;

  const headerStore = await headers();
  const plugins = await discoverProviders({ headers: headerStore });

  return <LoginClient initialUser={initialUser} plugins={plugins} />;
}
