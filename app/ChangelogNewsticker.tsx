// app/ChangelogNewsticker.tsx
//
// Server component — reads the last 12 changelog entries and renders an
// animated horizontal newsticker. Each headline links to its entry on the
// /changelog page via a hash anchor. Hovering pauses the animation.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2}) (.+)\.md$/;

/** Convert a changelog filename to a stable URL-safe anchor id. */
export function changelogEntrySlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Entry {
  filename: string;
  title: string;
  date: string; // ISO 8601
}

function getGitAddedTimestamps(changelogDir: string): Map<string, number> {
  const map = new Map<string, number>();
  try {
    const output = execSync(
      "git log --diff-filter=A --format=COMMIT:%ct --name-only -- changelog/",
      { cwd: path.dirname(changelogDir), encoding: "utf8" }
    );
    let currentTs = 0;
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("COMMIT:")) {
        currentTs = parseInt(trimmed.slice(7), 10);
      } else if (trimmed.startsWith("changelog/")) {
        const fname = trimmed.slice("changelog/".length);
        if (fname && !map.has(fname)) map.set(fname, currentTs);
      }
    }
  } catch {
    // git unavailable — callers fall back to filename order
  }
  return map;
}

function loadRecentEntries(limit = 12): Entry[] {
  try {
    const changelogDir = path.join(process.cwd(), "changelog");
    const commitTimes = getGitAddedTimestamps(changelogDir);
    const files = fs
      .readdirSync(changelogDir)
      .filter((f) => FILENAME_RE.test(f))
      .sort((a, b) => {
        const tsA = commitTimes.get(a) ?? 0;
        const tsB = commitTimes.get(b) ?? 0;
        if (tsB !== tsA) return tsB - tsA;
        return a < b ? 1 : a > b ? -1 : 0;
      })
      .slice(0, limit);

    return files.map((file) => {
      const m = file.match(FILENAME_RE)!;
      const [, datePart, timePart, title] = m;
      const date = `${datePart}T${timePart.replace(/-/g, ":")}`;
      return { filename: file, title, date };
    });
  } catch {
    return [];
  }
}

export function ChangelogNewsticker() {
  const entries = loadRecentEntries(12);
  if (entries.length === 0) return null;

  // Duplicate items so the ticker loops seamlessly (first half scrolls out,
  // second half is identical and scrolls in — then animation resets to 0).
  const doubled = [...entries, ...entries];

  return (
    <div
      className="w-full bg-gray-900/80 border-b border-gray-800 overflow-hidden"
      aria-label="Recent changelog headlines"
    >
      <div className="flex items-center h-9">
        {/* Static "UPDATES" badge */}
        <span className="flex-shrink-0 px-3 h-full flex items-center text-[10px] font-bold tracking-widest text-violet-400 bg-gray-800/80 border-r border-gray-700 uppercase select-none">
          Updates
        </span>

        {/* Scrolling strip */}
        <div className="relative flex-1 overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-gray-900/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-gray-900/80 to-transparent" />

          <ul className="animate-ticker flex gap-0 whitespace-nowrap" aria-hidden="false">
            {doubled.map((entry, i) => {
              const slug = changelogEntrySlug(entry.filename);
              const dateLabel = new Date(entry.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <li key={`${entry.filename}-${i}`} className="inline-flex items-center">
                  <Link
                    href={withBasePath(`/changelog#${slug}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-0 text-xs text-gray-300 hover:text-violet-300 transition-colors group"
                    title={entry.title}
                  >
                    <span className="text-gray-600 group-hover:text-violet-500 transition-colors">◆</span>
                    <span className="text-gray-500">{dateLabel}</span>
                    <span className="max-w-xs truncate">{entry.title}</span>
                  </Link>
                  {/* Bullet separator — hidden after last item in each half */}
                  {i !== entries.length - 1 && i !== doubled.length - 1 && (
                    <span className="text-gray-700 select-none">·</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
