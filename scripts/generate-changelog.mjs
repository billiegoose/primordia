#!/usr/bin/env node
// scripts/generate-changelog.mjs
//
// Generates public/changelog.json from changelog/*.md files.
//
// Filename convention: YYYY-MM-DD-HH-MM-SS Description of change.md
//   - The date+time portion is used for sorting (newest first).
//   - Everything after the first space is the human-readable title.
//   - The file body contains the full description (markdown).
//
// Run automatically as a prebuild/predev step (see package.json).

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const changelogDir = join(repoRoot, "changelog");

// Matches: YYYY-MM-DD-HH-MM-SS Description of change.md
const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2}) (.+)\.md$/;

let entries = [];

try {
  const files = readdirSync(changelogDir)
    .filter((f) => FILENAME_RE.test(f))
    .sort()    // lexicographic sort = chronological order
    .reverse(); // newest first

  for (const file of files) {
    const m = file.match(FILENAME_RE);
    if (!m) continue;

    const [, datePart, timePart, title] = m;
    // Convert YYYY-MM-DD + HH-MM-SS → ISO 8601 datetime string
    const isoDate = `${datePart}T${timePart.replace(/-/g, ":")}`;

    let content = "";
    try {
      content = readFileSync(join(changelogDir, file), "utf-8").trim();
    } catch {
      console.warn(`changelog: could not read ${file}, skipping`);
    }

    entries.push({ filename: file, date: isoDate, title, content });
  }
} catch (e) {
  console.warn("changelog: could not read changelog/ directory:", e.message);
}

// Write to public/ so Next.js server components can read it at build/render time.
const publicDir = join(repoRoot, "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(
  join(publicDir, "changelog.json"),
  JSON.stringify(entries, null, 2)
);
console.log(`changelog: wrote ${entries.length} entries → public/changelog.json`);
