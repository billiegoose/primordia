// bun.d.ts — Minimal ambient type declarations for Bun built-in modules.
// These are only available at runtime in the Bun environment.
// TypeScript needs these declarations to avoid TS2307 errors; the actual
// implementation is provided by Bun itself at runtime (never bundled by webpack).

declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string, options?: { create?: boolean; readonly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    run(...params: unknown[]): void;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }
}

// Bun extends ImportMeta with additional properties not present in standard TypeScript.
interface ImportMeta {
  /** Absolute path to the directory containing the current file (Bun only). */
  dir: string;
}
