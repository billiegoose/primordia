// lib/auth-providers/types.ts
// Core interfaces for the pluggable authentication system.
//
// To create a new auth provider:
//   1. Create lib/auth-providers/<id>/index.ts  — export a default AuthPlugin
//   2. Create components/auth-tabs/<id>/index.tsx — export a default ComponentType<AuthTabProps>
//   3. Add API routes under app/(<id>-auth)/api/auth/<id>/
//
// No registry files to edit. The login page auto-discovers providers by
// scanning lib/auth-providers/ with fs.readdirSync at request time.

/**
 * Minimal context passed to a plugin's getServerProps().
 * Intentionally generic — does not import Next.js types — so providers
 * can be unit-tested without a Next.js runtime.
 */
export interface AuthPluginServerContext {
  /** HTTP request headers. */
  headers: { get(name: string): string | null };
}

/**
 * Server-side descriptor for one authentication mechanism.
 * Export this as the default export from lib/auth-providers/<id>/index.ts.
 */
export interface AuthPlugin {
  /** Immutable slug — must match the directory name and the tab component directory. */
  id: string;
  /** Human-readable name shown on the login tab. */
  label: string;
  /**
   * Optional: gather server-side data to pass down to the client tab component.
   * Called once per page render for each installed provider.
   * Return an empty object {} if no server data is needed.
   */
  getServerProps?: (
    ctx: AuthPluginServerContext
  ) => Promise<Record<string, unknown>>;
}

/**
 * The resolved metadata for one plugin, ready to pass to the client.
 * Contains the plugin's id + label plus whatever getServerProps returned.
 */
export interface InstalledPlugin {
  id: string;
  label: string;
  serverProps: Record<string, unknown>;
}

// ─── Client-side ─────────────────────────────────────────────────────────────

/**
 * Props passed to every auth plugin tab component.
 * Export a ComponentType<AuthTabProps> as the default export from
 * components/auth-tabs/<id>/index.tsx.
 *
 * @param serverProps  Whatever the plugin's getServerProps() returned.
 * @param nextUrl      The URL to navigate to after successful authentication.
 * @param onSuccess    Call with the authenticated username to trigger redirect.
 */
export interface AuthTabProps {
  serverProps: Record<string, unknown>;
  nextUrl: string;
  onSuccess: (username: string) => void;
}
