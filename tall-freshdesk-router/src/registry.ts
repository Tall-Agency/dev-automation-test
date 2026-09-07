import type {
  RepoEntry,
  ResolveResult,
  SiteEntry,
  SiteRegistry,
} from "./types.ts";

/** Normalize Website URL dropdown values for registry lookup. */
export function normalizeWebsiteUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  let value = String(raw).trim();
  if (!value) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `https://${host}${path === "/" ? "" : path}`;
  } catch {
    return value.toLowerCase().replace(/\/+$/, "").replace(/^www\./, "");
  }
}

function repoMatches(entry: RepoEntry, requested: string): boolean {
  const needle = requested.trim().toLowerCase();
  if (!needle) return false;
  return (
    entry.github.toLowerCase() === needle ||
    entry.label.toLowerCase() === needle
  );
}

function findSite(
  registry: SiteRegistry,
  websiteUrl: string
): { key: string; site: SiteEntry } | null {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  if (!normalized) return null;

  for (const [key, site] of Object.entries(registry.sites)) {
    if (normalizeWebsiteUrl(key) === normalized) {
      return { key, site };
    }
  }
  return null;
}

/**
 * Resolve Website URL + optional Repo to a concrete repo entry.
 * - Missing URL → error
 * - Unknown URL → error
 * - Repo set and valid → use it
 * - Repo missing + exactly one repo → auto-select
 * - Repo missing + 2+ repos → error
 * - Repo set but not under that site → error
 */
export function resolveSiteAndRepo(
  registry: SiteRegistry,
  websiteUrl: string | null | undefined,
  repoField: string | null | undefined
): ResolveResult {
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  if (!normalizedUrl) {
    return {
      ok: false,
      code: "missing_website_url",
      message:
        "Website URL is missing on this ticket. Set the Website URL dropdown so Cursor can route to the correct site.",
    };
  }

  const found = findSite(registry, normalizedUrl);
  if (!found) {
    return {
      ok: false,
      code: "unknown_website_url",
      message: `Website URL "${websiteUrl}" is not in the site registry. Add it to site-registry.json or pick a registered SLA URL.`,
    };
  }

  const { site } = found;
  const repos = site.repos ?? [];
  const requestedRepo = (repoField ?? "").trim();

  if (requestedRepo) {
    const match = repos.find((r) => repoMatches(r, requestedRepo));
    if (!match) {
      const allowed = repos.map((r) => r.label || r.github).join(", ");
      return {
        ok: false,
        code: "invalid_repo",
        message: `Repo "${requestedRepo}" is not valid for Website URL "${normalizedUrl}". Allowed: ${allowed || "(none registered)"}.`,
      };
    }
    return {
      ok: true,
      websiteUrl: normalizedUrl,
      site,
      repo: match,
      autoSelectedRepo: false,
    };
  }

  if (repos.length === 1) {
    return {
      ok: true,
      websiteUrl: normalizedUrl,
      site,
      repo: repos[0],
      autoSelectedRepo: true,
    };
  }

  if (repos.length === 0) {
    return {
      ok: false,
      code: "missing_repo_multi",
      message: `Website URL "${normalizedUrl}" has no repos in the registry.`,
    };
  }

  const allowed = repos.map((r) => r.label || r.github).join(", ");
  return {
    ok: false,
    code: "missing_repo_multi",
    message: `This site has multiple repos. Set the Repo dropdown. Options: ${allowed}.`,
  };
}

export function eventToPhase(
  event: string
): "plan" | "implement" | "reopened_nudge" | null {
  switch (event) {
    case "ticket_created":
      return "plan";
    case "note_added":
      return "implement";
    case "ticket_reopened":
      return "reopened_nudge";
    default:
      return null;
  }
}
