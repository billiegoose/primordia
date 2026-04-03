#!/usr/bin/env bun
// scripts/rollback.ts
// Standalone fast rollback: swaps the blue/green current ↔ previous slots and
// restarts the systemd service. Equivalent to POST /api/rollback but runs
// directly via bun — use this when the server itself is broken or unresponsive.
//
// Usage: bun run rollback
//   (no authentication — run via SSH / direct terminal access only)

import { execSync } from 'child_process';
import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as path from 'path';

const DB_NAME = '.primordia-auth.db';

/**
 * Creates a consistent point-in-time snapshot of the SQLite DB using
 * VACUUM INTO — safe while the source DB is being actively written to.
 */
function copyDb(srcDir: string, dstDir: string): void {
  const srcDb = path.join(srcDir, DB_NAME);
  if (!fs.existsSync(srcDb)) return;
  const dstDb = path.join(dstDir, DB_NAME);
  // VACUUM INTO fails if the destination file already exists
  fs.rmSync(dstDb, { force: true });
  fs.rmSync(dstDb + '-wal', { force: true });
  fs.rmSync(dstDb + '-shm', { force: true });
  const db = new Database(srcDb);
  try {
    db.prepare('VACUUM INTO ?').run(dstDb);
  } finally {
    db.close();
  }
}

// Locate the primordia-worktrees directory.
// install-service.sh places it at <repo-parent>/primordia-worktrees:
//   scripts/rollback.ts  →  ../  = repo root  →  ../../primordia-worktrees
const repoRoot = path.resolve(import.meta.dir, '..');
const worktreesDir = path.resolve(repoRoot, '..', 'primordia-worktrees');
const currentSymlink = path.join(worktreesDir, 'current');
const previousSymlink = path.join(worktreesDir, 'previous');

if (!fs.existsSync(worktreesDir)) {
  console.error(`Error: worktrees directory not found: ${worktreesDir}`);
  process.exit(1);
}

let currentTarget: string;
try {
  currentTarget = path.resolve(fs.readlinkSync(currentSymlink));
} catch {
  console.error(`Error: no 'current' symlink at ${currentSymlink}`);
  process.exit(1);
}

let previousTarget: string;
try {
  previousTarget = path.resolve(fs.readlinkSync(previousSymlink));
} catch {
  console.error('Error: no \'previous\' slot to roll back to.');
  console.error(`  current → ${currentTarget}`);
  process.exit(1);
}

console.log('Rolling back:');
console.log(`  current  → ${currentTarget}`);
console.log(`  previous → ${previousTarget}`);
console.log('');

// Copy the live DB into the previous slot so auth data is preserved.
console.log('Copying database from current slot to previous slot...');
try {
  copyDb(currentTarget, previousTarget);
  console.log('  Done.');
} catch (err) {
  console.warn(`  Warning: DB copy failed (proceeding anyway): ${err}`);
}

// Atomically swap current ↔ previous.
console.log('Swapping symlinks...');
const tmpCurrent = currentSymlink + '.tmp';
fs.symlinkSync(previousTarget, tmpCurrent);
fs.renameSync(tmpCurrent, currentSymlink);

const tmpPrevious = previousSymlink + '.tmp';
fs.symlinkSync(currentTarget, tmpPrevious);
fs.renameSync(tmpPrevious, previousSymlink);

console.log(`  current  → ${previousTarget}`);
console.log(`  previous → ${currentTarget}`);
console.log('');

// Restart the systemd service on the rolled-back slot.
console.log('Restarting systemd service...');
try {
  execSync('sudo systemctl restart primordia', { stdio: 'inherit' });
  console.log('  Service restarted.');
} catch (err) {
  console.error(`  Failed to restart service: ${err}`);
  console.error('  Run manually: sudo systemctl restart primordia');
  process.exit(1);
}

console.log('');
console.log('Rollback complete.');
