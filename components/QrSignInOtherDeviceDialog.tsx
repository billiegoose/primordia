"use client";

// components/QrSignInOtherDeviceDialog.tsx
// Dialog shown to already-authenticated users from the hamburger menu.
// Two tabs:
//
//  "Sign in on another device" — push flow (pre-approved token + AES keys in QR fragment).
//  "Approve a sign-in"         — pull flow approver: paste a QR URL or token ID,
//                                optionally also encrypt credentials for the requester.
//
// Push flow detail:
//   1. Reads AES encryption key JWKs from localStorage (if any are stored).
//   2. POSTs to /api/auth/cross-device/push to create a pre-approved token.
//      No keys are sent to the server.
//   3. Builds a receive URL with keys in the URL fragment (#k1=...&k2=...).
//      Fragments are never sent to the server — they exist only in the browser.
//   4. Generates the QR code entirely client-side so the server never sees the
//      fragment, and therefore never sees the AES keys.
//   5. The scanning device reads the keys from the fragment on its own page
//      and stores them in localStorage — keys travel only through the QR code.
//
// Approve tab detail:
//   The approver pastes the QR URL (or token ID). If the URL contains a `pk=`
//   param, credentials are encrypted for the requester and sent alongside the
//   approval — same ECDH mechanism as the /login/approve page.

import { useState, useEffect, useCallback } from "react";
import { QrCode, X, RefreshCw, Check, KeyRound } from "lucide-react";
import { withBasePath, basePath } from "@/lib/base-path";
import QRCode from "qrcode";
import { encryptCredentialsForRequester } from "@/lib/cross-device-creds";

interface QrSignInOtherDeviceDialogProps {
  onClose: () => void;
}

type PushPhase = "loading" | "ready" | "error";
type ApprovePhase = "idle" | "approving" | "done" | "error";
type ActiveTab = "push" | "approve";

// URL-safe base64 encoding (no +, /, or = padding) so fragment params stay compact.
function b64uEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Parse a pasted token input: accepts a full URL, a partial URL with query params,
 * or a bare token ID.  Extracts both `token` and `pk` params if present.
 */
function parseTokenInput(input: string): { tokenId: string; pk: string | null } | null {
  const s = input.trim();
  if (!s) return null;
  try {
    let url: URL;
    if (s.startsWith("http://") || s.startsWith("https://")) {
      url = new URL(s);
    } else if (s.includes("?")) {
      url = new URL("http://x/" + s.replace(/^\/+/, ""));
    } else {
      // Bare token ID — no pk
      return { tokenId: s, pk: null };
    }
    const tokenId = url.searchParams.get("token");
    const pk = url.searchParams.get("pk");
    if (tokenId) return { tokenId, pk };
    return null;
  } catch {
    // Couldn't parse as URL — treat as bare token ID
    return { tokenId: s, pk: null };
  }
}

export function QrSignInOtherDeviceDialog({ onClose }: QrSignInOtherDeviceDialogProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("push");

  // ── Push tab state ──────────────────────────────────────────────────────────
  const [pushPhase, setPushPhase] = useState<PushPhase>("loading");
  const [qrImgSrc, setQrImgSrc] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // ── Approve tab state ───────────────────────────────────────────────────────
  const [approveInput, setApproveInput] = useState("");
  const [approvePhase, setApprovePhase] = useState<ApprovePhase>("idle");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [credsSynced, setCredsSynced] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Push flow ───────────────────────────────────────────────────────────────

  const startPushFlow = useCallback(async () => {
    setPushPhase("loading");
    setPushError(null);
    setQrImgSrc(null);

    // Read AES key JWK strings from localStorage.
    // These never leave the browser in this flow — they travel only via the QR code.
    let rawApiKeyJwk: string | null = null;
    let rawCredentialsKeyJwk: string | null = null;
    try {
      rawApiKeyJwk = localStorage.getItem("primordia_aes_key");
      rawCredentialsKeyJwk = localStorage.getItem("primordia_credentials_aes_key");
    } catch {
      // localStorage unavailable — continue without key transfer
    }

    try {
      // Create a pre-approved push token on the server (no keys involved).
      const res = await fetch(withBasePath("/api/auth/cross-device/push"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { tokenId?: string; error?: string };
      if (!res.ok || !data.tokenId) {
        setPushPhase("error");
        setPushError(data.error ?? "Failed to generate QR code.");
        return;
      }

      // Build receive URL. Keys go in the fragment — browsers never send the
      // fragment to the server, so the AES keys are invisible to the server.
      const origin = window.location.origin;
      const base = `${origin}${basePath}/login/cross-device-receive?token=${data.tokenId}`;
      const parts: string[] = [];
      if (rawApiKeyJwk) parts.push(`k1=${b64uEncode(rawApiKeyJwk)}`);
      if (rawCredentialsKeyJwk) parts.push(`k2=${b64uEncode(rawCredentialsKeyJwk)}`);
      const receiveUrl = parts.length > 0 ? `${base}#${parts.join("&")}` : base;

      // Generate the QR code entirely in the browser.
      const svg = await QRCode.toString(receiveUrl, {
        type: "svg",
        margin: 2,
        color: {
          dark: "#ffffff",   // white modules on dark theme
          light: "#111827",  // gray-900 background
        },
      });
      // btoa is safe here: qrcode SVG output is pure ASCII
      const imgSrc = `data:image/svg+xml;base64,${btoa(svg)}`;
      setQrImgSrc(imgSrc);
      setPushPhase("ready");
    } catch {
      setPushPhase("error");
      setPushError("Network error. Please try again.");
    }
  }, []);

  // Start the push flow on mount.
  useEffect(() => {
    startPushFlow();
  }, [startPushFlow]);

  // ── Approve flow ────────────────────────────────────────────────────────────

  async function handleApprove() {
    const parsed = parseTokenInput(approveInput);
    if (!parsed) {
      setApproveError("Enter a valid token URL or token ID.");
      return;
    }
    setApprovePhase("approving");
    setApproveError(null);
    setCredsSynced(false);

    try {
      // If the QR URL contained a `pk=` param, encrypt our credentials for the requester.
      let encryptedCredentials = null;
      if (parsed.pk) {
        try {
          const k1 = localStorage.getItem("primordia_aes_key");
          const k2 = localStorage.getItem("primordia_credentials_aes_key");
          encryptedCredentials = await encryptCredentialsForRequester(parsed.pk, k1, k2);
        } catch {
          // Encryption failed — proceed without credential sync
        }
      }

      const res = await fetch(withBasePath("/api/auth/cross-device/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: parsed.tokenId, encryptedCredentials }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setApprovePhase("error");
        setApproveError(data.error ?? "Approval failed.");
        return;
      }
      setCredsSynced(!!encryptedCredentials);
      setApprovePhase("done");
    } catch {
      setApprovePhase("error");
      setApproveError("Network error. Please try again.");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-400">
            <QrCode size={18} strokeWidth={2} aria-hidden="true" />
            <h2 className="text-base font-semibold">Device sign-in</h2>
          </div>
          <button
            data-id="qr-signin-other/close"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("push")}
            className={`flex-1 px-3 py-2 transition-colors ${
              activeTab === "push"
                ? "bg-gray-700 text-white font-medium"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sign in another device
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("approve")}
            className={`flex-1 px-3 py-2 transition-colors border-l border-gray-700 ${
              activeTab === "approve"
                ? "bg-gray-700 text-white font-medium"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Approve a sign-in
          </button>
        </div>

        {/* ── Push tab ── */}
        {activeTab === "push" && (
          <>
            <p className="text-sm text-gray-400 leading-relaxed">
              Scan this QR code on another device to sign in as you. Your API key
              and credential encryption keys are embedded directly in the QR code —
              they never pass through the server.
            </p>

            {pushPhase === "loading" && (
              <div className="flex justify-center py-8">
                <span className="text-gray-500 text-sm animate-pulse">
                  Generating QR code&hellip;
                </span>
              </div>
            )}

            {pushPhase === "ready" && qrImgSrc && (
              <div className="space-y-3">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImgSrc}
                    alt="QR code for signing in on another device"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  QR code expires in 10 minutes.
                </p>
                <button
                  type="button"
                  onClick={startPushFlow}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
                  Refresh QR code
                </button>
              </div>
            )}

            {pushPhase === "error" && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  {pushError ?? "Something went wrong."}
                </p>
                <button
                  type="button"
                  onClick={startPushFlow}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Approve tab ── */}
        {activeTab === "approve" && (
          <>
            <p className="text-sm text-gray-400 leading-relaxed">
              Another device is showing a QR code on the sign-in page. Paste its
              URL here to approve the login. If the URL contains a credential key,
              your keys will also be copied to that device.
            </p>

            {approvePhase !== "done" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={approveInput}
                  onChange={(e) => {
                    setApproveInput(e.target.value);
                    setApproveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApprove();
                  }}
                  placeholder="Paste URL or token ID…"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={approvePhase === "approving"}
                />

                {/* Show credential sync hint if the pasted URL has a pk param */}
                {parseTokenInput(approveInput)?.pk && (() => {
                  try {
                    const k1 = localStorage.getItem("primordia_aes_key");
                    const k2 = localStorage.getItem("primordia_credentials_aes_key");
                    if (k1 || k2) {
                      return (
                        <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-800/30 rounded-lg px-3 py-2">
                          <KeyRound size={13} strokeWidth={2} className="text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                          <p className="text-xs text-blue-300">
                            Your credential keys will also be copied to the other device.
                          </p>
                        </div>
                      );
                    }
                  } catch { /* localStorage unavailable */ }
                  return null;
                })()}

                {approveError && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                    {approveError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approvePhase === "approving" || !approveInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {approvePhase === "approving" ? (
                    <span className="animate-pulse">Approving&hellip;</span>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                      Approve sign-in
                    </>
                  )}
                </button>
              </div>
            )}

            {approvePhase === "done" && (
              <div className="text-center space-y-3">
                <p className="text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-lg px-3 py-2">
                  Done! The other device is now signed in.
                  {credsSynced && " Credentials were also copied."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setApprovePhase("idle");
                    setApproveInput("");
                    setCredsSynced(false);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Approve another
                </button>
              </div>
            )}
          </>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors text-center"
        >
          Close
        </button>
      </div>
    </div>
  );
}
