// app/api/evolve/local/manage/route.ts
// Accept or reject a local evolve session (development only).
//
// POST
//   Body: { action: "accept" | "reject"; sessionId: string }
//
//   accept — merges the preview branch into main, kills the dev server,
//            removes the worktree.
//   reject — kills the dev server, removes the worktree and branch.
//
// CORS headers are included so the child preview instance (running on a
// different localhost port) can call this endpoint cross-origin.

import {
  sessions,
  acceptSession,
  rejectSession,
} from '../../../../../lib/local-evolve-sessions';

// Allow the child preview instance (different port) to POST here cross-origin.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json(
      { error: 'Local evolve is only available in development mode' },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { action?: string; sessionId?: string };

  if (!body.action || !body.sessionId) {
    return Response.json({ error: 'action and sessionId are required' }, { status: 400, headers: corsHeaders });
  }

  const session = sessions.get(body.sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404, headers: corsHeaders });
  }

  const repoRoot = process.cwd();

  try {
    if (body.action === 'accept') {
      await acceptSession(session, repoRoot);
      return Response.json({ outcome: 'accepted', branch: session.branch }, { headers: corsHeaders });
    }

    if (body.action === 'reject') {
      await rejectSession(session, repoRoot);
      return Response.json({ outcome: 'rejected' }, { headers: corsHeaders });
    }

    return Response.json(
      { error: 'action must be "accept" or "reject"' },
      { status: 400, headers: corsHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
