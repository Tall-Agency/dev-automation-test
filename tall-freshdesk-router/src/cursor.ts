import type { CursorPhase, EnrichedCursorPayload, Env, RepoEntry } from "./types.ts";

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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.CURSOR_WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${env.CURSOR_WEBHOOK_SECRET}`;
  }

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
