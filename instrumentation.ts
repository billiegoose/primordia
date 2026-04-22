// instrumentation.ts — Next.js server instrumentation hook.
// Runs once when the Next.js server starts (Node/Bun runtime only).
// If PRIMORDIA_PARENT_URL is set, this instance registers itself with its
// parent by POSTing to the parent's /api/instance/register endpoint.

export async function register() {
  // Only run in the Node/Bun runtime, not in the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const parentUrl = process.env.PRIMORDIA_PARENT_URL?.replace(/\/$/, "");
  if (!parentUrl) return;

  // Dynamically import DB to avoid bundling issues.
  const { getDb } = await import("./lib/db");

  // Small delay to let the DB initialise (uuid7 is seeded on first getDb() call).
  await new Promise((resolve) => setTimeout(resolve, 500));

  const db = await getDb();
  const config = await db.getInstanceConfig();

  if (!config.uuid7) {
    console.warn("[primordia] instrumentation: instance uuid7 not yet set, skipping parent registration");
    return;
  }

  const canonicalUrl =
    process.env.PRIMORDIA_CANONICAL_URL?.replace(/\/$/, "") ?? "";

  if (!canonicalUrl) {
    console.warn("[primordia] instrumentation: PRIMORDIA_CANONICAL_URL not set, skipping parent registration (parent needs a URL to reach back)");
    return;
  }

  const body = {
    uuid7: config.uuid7,
    url: canonicalUrl,
    name: config.name,
    description: config.description || undefined,
  };

  try {
    const res = await fetch(`${parentUrl}/api/instance/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      console.log(`[primordia] Registered with parent instance at ${parentUrl}`);
    } else {
      const text = await res.text().catch(() => res.statusText);
      console.warn(`[primordia] Parent registration returned ${res.status}: ${text}`);
    }
  } catch (err) {
    console.warn(`[primordia] Failed to register with parent at ${parentUrl}:`, err);
  }
}
