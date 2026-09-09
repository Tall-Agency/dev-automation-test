import type { CursorPhase, EnrichedCursorPayload, Env, RepoEntry } from "./types.ts";

/** Env var holding the token for each phase, for use in error messages. */
export function tokenVarForPhase(phase: CursorPhase): string {
  switch (phase) {
    case "plan":
      return "CURSOR_TOKEN_PLAN";
    case "implement":
      return "CURSOR_TOKEN_IMPLEMENT";
    case "reopened_nudge":
      return "CURSOR_TOKEN_REOPENED_NUDGE";
  }
}

/**
 * Cursor's "Copy auth header" button yields `Authorization: Bearer crsr_…`, so
 * the stored secret often carries one or both prefixes. Sending those through
 * unchanged produces `Bearer Bearer crsr_…` and a confusing "Invalid API key".
 */
export function normalizeToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const token = raw
    .trim()
    .replace(/^Authorization\s*:\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return undefined;

  // A Cursor token is "crsr_" plus 64 hex characters. Selecting the value out of
  // a copied header easily drops the prefix, which fails as "Invalid API key"
  // rather than anything that points at a missing prefix.
  if (/^[0-9a-f]{64}$/i.test(token)) return `crsr_${token}`;

  return token;
}

export function tokenForPhase(
  env: Env,
  phase: CursorPhase
): string | undefined {
  const scoped =
    phase === "plan"
      ? env.CURSOR_TOKEN_PLAN
      : phase === "implement"
        ? env.CURSOR_TOKEN_IMPLEMENT
        : env.CURSOR_TOKEN_REOPENED_NUDGE;

  return normalizeToken(scoped) || normalizeToken(env.CURSOR_WEBHOOK_SECRET);
}

export async function forwardToCursor(
  env: Env,
  webhookUrl: string,
  payload: EnrichedCursorPayload
): Promise<{ status: number; body: string }> {
  if (!webhookUrl || webhookUrl.includes("REPLACE_WITH_")) {
    throw new Error(
      `Cursor webhook URL is not configured for phase ${payload.phase} / repo ${payload.repo.github}`
    );
  }

  const token = tokenForPhase(env, payload.phase);
  if (!token) {
    throw new Error(
      `No Cursor token for phase ${payload.phase}. Set ${tokenVarForPhase(payload.phase)} to that automation's auth token.`
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  return { status: res.status, body };
}

export function webhookForPhase(
  repo: RepoEntry,
  phase: CursorPhase
): string {
  return repo.cursor_webhooks[phase];
}
