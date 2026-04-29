"use client";

// app/login/cross-device-receive/page.tsx
// Visited by Device B after scanning the QR code shown on Device A's
// "Sign in on another device" dialog.
//
// Flow:
//   1. Page reads ?token=<tokenId> from the URL query string.
//   2. Reads AES key JWKs from the URL fragment (#k1=...&k2=...) — these
//      were embedded by Device A when generating the QR code client-side and
//      never passed through the server.
//   3. Saves the keys to localStorage immediately, then clears the fragment
//      from the URL bar so the raw keys don't linger in browser history.
//   4. Polls /api/auth/cross-device/poll (push tokens are pre-approved, so
//      the first poll should return "approved" and set the session cookie).
//   5. Redirects to the home page.

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

type Phase = "loading" | "approved" | "expired" | "error";

// Decode a base64url-encoded string back to its original value.
function b64uDecode(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

function ReceivePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get("token");

  const [phase, setPhase] = useState<Phase>(() =>
    tokenId ? "loading" : "error"
  );
  const [username, setUsername] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(() =>
    tokenId ? null : "No token found in URL. This QR code may be invalid."
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Extract AES key JWKs from the URL fragment and store them in localStorage.
  // This runs once on mount, before polling starts.
  // The fragment was embedded by Device A when it generated the QR code client-side —
  // it was never sent to the server, so we're the first (and only) code that sees it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1); // strip leading #
    if (hash) {
      const params = new URLSearchParams(hash);
      const k1 = params.get("k1");
      const k2 = params.get("k2");
      if (k1) {
        try {
          localStorage.setItem("primordia_aes_key", b64uDecode(k1));
        } catch {
          // localStorage unavailable — not fatal
        }
      }
      if (k2) {
        try {
          localStorage.setItem("primordia_credentials_aes_key", b64uDecode(k2));
        } catch {
          // localStorage unavailable — not fatal
        }
      }
      // Remove the fragment from the URL bar so the raw keys don't persist
      // in browser history or get accidentally shared via URL copy-paste.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []); // run once on mount

  useEffect(() => {
    if (!tokenId) return;

    async function poll() {
      try {
        const res = await fetch(
          withBasePath(`/api/auth/cross-device/poll?tokenId=${tokenId}`)
        );
        const data = (await res.json()) as {
          status?: string;
          username?: string;
        };

        if (data.status === "approved") {
          // Stop polling
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setUsername(data.username ?? null);
          setPhase("approved");

          // Redirect to home after a brief moment so the success state is visible.
          setTimeout(() => router.push("/"), 1800);
        } else if (data.status === "expired" || data.status === "not_found") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setPhase("expired");
        }
        // "pending" → keep polling (unexpected for push tokens, but handled gracefully)
      } catch {
        // Transient network error — keep polling
      }
    }

    // Poll immediately, then every 2 seconds.
    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tokenId, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-4 py-12 bg-gray-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Signing you in…
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Completing cross-device sign-in.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2
                size={32}
                strokeWidth={1.5}
                className="text-blue-400 animate-spin"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-400 animate-pulse">
                Completing sign-in&hellip;
              </p>
            </div>
          )}

          {phase === "approved" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle
                size={32}
                strokeWidth={1.5}
                className="text-green-400"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm text-green-400 font-medium">
                  Signed in{username ? ` as @${username}` : ""}!
                </p>
                <p className="text-xs text-gray-500">
                  Redirecting you now&hellip;
                </p>
              </div>
            </div>
          )}

          {phase === "expired" && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
                This QR code has expired. Ask the other device to generate a new one.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Go to sign-in &rarr;
              </Link>
            </div>
          )}

          {phase === "error" && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {errorMsg ?? "Something went wrong."}
            </p>
          )}
        </div>

        {/* Back link */}
        <p className="text-center">
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            &larr; Back to Primordia
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function CrossDeviceReceivePage() {
  return (
    <Suspense>
      <ReceivePageInner />
    </Suspense>
  );
}
