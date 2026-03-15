/**
 * Stable client identifier for the current browser tab.
 * Used to filter out Ably messages that originated from our own mutations.
 *
 * Uses crypto.getRandomValues (works in all contexts including plain HTTP)
 * instead of crypto.randomUUID (which requires a secure context / HTTPS).
 */
function generateClientId(): string {
  if (typeof crypto === "undefined") return "";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const CLIENT_ID = generateClientId();

/**
 * Suppress Ably-triggered refreshes for a short window.
 * Acts as a safety net alongside clientId filtering -- prevents
 * router.refresh() from firing while a local transition is in-flight,
 * even if the senderId filter fails (e.g. cookie not set yet).
 */
let suppressUntil = 0;
const SUPPRESS_DURATION_MS = 2000;

export function suppressGameSync() {
  suppressUntil = Date.now() + SUPPRESS_DURATION_MS;
}

export function isGameSyncSuppressed(): boolean {
  return Date.now() < suppressUntil;
}
