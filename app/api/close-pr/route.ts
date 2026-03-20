// app/api/close-pr/route.ts
// Closes a PR via the GitHub API.
// Called when the user clicks "Reject" in the accept/reject bar on a Vercel deploy preview.
//
// POST body: { prNumber: number }
// Response:  { closed: true } | { error: string }
//
// Required environment variables:
//   GITHUB_TOKEN  — personal access token with repo write access
//   GITHUB_REPO   — "owner/repo" string, e.g. "alice/primordia"

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return Response.json(
      { error: "Missing GITHUB_TOKEN or GITHUB_REPO" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as { prNumber?: number };

  if (!body.prNumber) {
    return Response.json({ error: "Missing prNumber" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const closeRes = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${body.prNumber}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ state: "closed" }),
    }
  );

  if (!closeRes.ok) {
    const errData = (await closeRes.json()) as { message?: string };
    return Response.json(
      { error: errData.message ?? `GitHub error: ${closeRes.statusText}` },
      { status: closeRes.status }
    );
  }

  return Response.json({ closed: true });
}
