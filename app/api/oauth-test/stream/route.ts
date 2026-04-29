// app/api/oauth-test/stream/route.ts
// GET ?from=<chunkIndex> — SSE stream of process output.
//
// Events:
//   data: { chunks: string[], chunkCount: number, oauthUrl: string|null, status: string }
//   data: { done: true }   — sent after terminal state (complete|error)

import { getChunksSince, getSnapshot } from "@/lib/oauth-test-session";

const POLL_MS = 250;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fromIndex = Math.max(
    0,
    parseInt(url.searchParams.get("from") ?? "0", 10) || 0
  );
  const signal = request.signal;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      let sent = fromIndex;

      const send = (data: Record<string, unknown>) => {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        while (true) {
          if (signal.aborted) {
            ctrl.close();
            return;
          }

          const snap = getSnapshot();
          const newChunks = getChunksSince(sent);
          const terminal =
            snap.status === "complete" || snap.status === "error";

          if (newChunks.length > 0 || terminal) {
            send({
              chunks: newChunks,
              chunkCount: snap.chunkCount,
              oauthUrl: snap.oauthUrl,
              status: snap.status,
            });
            sent = snap.chunkCount;
          }

          if (terminal) {
            send({ done: true });
            ctrl.close();
            return;
          }

          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, POLL_MS);
            signal.addEventListener(
              "abort",
              () => {
                clearTimeout(t);
                resolve();
              },
              { once: true }
            );
          });
        }
      } catch (err) {
        try {
          send({ error: String(err), done: true });
          ctrl.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
