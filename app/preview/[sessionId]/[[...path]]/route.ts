// app/preview/[sessionId]/[[...path]]/route.ts
// Proxies HTTP requests to a local preview dev server for the given evolve session.
//
// Preview servers run with NEXT_BASE_PATH=/preview/{sessionId}, so their pages
// are served at paths matching /preview/{sessionId}/... — exactly the paths
// this proxy intercepts. This keeps previews on the same origin as the main
// app, so cookies and auth work without cross-origin issues.
//
// WebSocket (HMR) connections cannot be proxied via route handlers and are
// intentionally not supported here — previews are for viewing, not hot-reloading.

import { getDb } from '../../../../lib/db';

type Params = { sessionId: string; path?: string[] };

async function proxy(
  request: Request,
  { params }: { params: Promise<Params> },
): Promise<Response> {
  const { sessionId, path = [] } = await params;

  const db = await getDb();
  const session = await db.getEvolveSession(sessionId);

  if (!session || session.port === null) {
    return new Response('Preview server not available — session not found or server not yet started.', {
      status: 502,
    });
  }

  const pathSuffix = path.length > 0 ? `/${path.join('/')}` : '';
  const { search } = new URL(request.url);
  const targetUrl = `http://localhost:${session.port}/preview/${sessionId}${pathSuffix}${search}`;

  // Forward all headers except host and accept-encoding.
  // Stripping accept-encoding prevents the upstream from compressing its response.
  // If we forwarded it, the upstream would compress the body, but Bun's fetch()
  // transparently decompresses it while still passing the Content-Encoding header
  // through — the browser then tries to decompress an already-decoded body and
  // throws a content encoding error.
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lk = key.toLowerCase();
    if (lk !== 'host' && lk !== 'accept-encoding') headers.append(key, value);
  }

  const isBodyMethod = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: isBodyMethod ? request.body : undefined,
      // @ts-expect-error — duplex is required for streaming request bodies in some runtimes
      duplex: isBodyMethod ? 'half' : undefined,
      redirect: 'manual',
    });
  } catch {
    return new Response('Preview server unreachable.', { status: 502 });
  }

  // Strip content-encoding and transfer-encoding from the upstream response.
  // Bun's fetch() transparently decompresses gzip/br/deflate responses and
  // unchunks transfer-encoded bodies, but still passes the original headers
  // through. If we forward them, the browser tries to decode an already-decoded
  // body and throws a content encoding error.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
