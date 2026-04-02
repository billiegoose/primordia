// lib/llm-client.ts
// Creates an Anthropic client, preferring the exe.dev LLM gateway when running
// on an exe.dev VM. Falls back to ANTHROPIC_API_KEY if the gateway is not reachable.
//
// The gateway is available at http://169.254.169.254/gateway/llm/anthropic inside
// exe.dev VMs and requires no API key. Outside of exe.dev the link-local address
// is unreachable, so the probe fails quickly and the API key is used instead.

import Anthropic from "@anthropic-ai/sdk";

const GATEWAY_BASE_URL = "http://169.254.169.254/gateway/llm/anthropic";
const PROBE_TIMEOUT_MS = 2000;

// Cached per server process. null = not yet checked.
let gatewayAvailable: boolean | null = null;

async function probeGateway(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    await fetch(GATEWAY_BASE_URL, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    return true; // any HTTP response means the gateway is reachable
  } catch {
    return false;
  }
}

/**
 * Returns an Anthropic client and the source that will be used.
 */
export async function getLlmClient(): Promise<{
  client: Anthropic;
  source: "gateway" | "api-key";
}> {
  if (gatewayAvailable === null) {
    gatewayAvailable = await probeGateway();
  }

  if (gatewayAvailable) {
    return {
      client: new Anthropic({
        baseURL: GATEWAY_BASE_URL,
        apiKey: "gateway", // gateway handles auth; SDK requires a non-empty value
      }),
      source: "gateway",
    };
  }

  return {
    client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    source: "api-key",
  };
}

/**
 * Returns true if the exe.dev gateway is reachable.
 * Useful for optional-key checks (check-keys endpoint).
 */
export async function isGatewayAvailable(): Promise<boolean> {
  if (gatewayAvailable === null) {
    gatewayAvailable = await probeGateway();
  }
  return gatewayAvailable;
}
