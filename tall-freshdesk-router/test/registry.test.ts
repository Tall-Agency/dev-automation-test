import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  eventToPhase,
  normalizeWebsiteUrl,
  resolveSiteAndRepo,
} from "../src/registry.ts";
import type { SiteRegistry } from "../src/types.ts";

const registry: SiteRegistry = {
  freshdesk_fields: {
    website_url: "cf_website_url",
    repo: "cf_repo",
  },
  sites: {
    "https://talldevstg.wpenginepowered.com": {
      slug: "tall-dev",
      staging_url: "https://talldevstg.wpenginepowered.com",
      bugherd_project_id: "527751",
      repos: [
        {
          github: "Tall-Agency/dev-automation-test",
          label: "Tall-Agency/dev-automation-test",
          default_branch: "main",
          theme_path: "web/app/themes/ai-dev",
          cursor_webhooks: {
            plan: "https://example.com/plan",
            implement: "https://example.com/implement",
            reopened_nudge: "https://example.com/nudge",
          },
        },
      ],
    },
    "https://example-client.com": {
      slug: "example-client",
      staging_url: "https://staging.example-client.com",
      repos: [
        {
          github: "tall-agency/example-client-wp",
          label: "tall-agency/example-client-wp",
          default_branch: "main",
          theme_path: "web/app/themes/client",
          cursor_webhooks: {
            plan: "https://example.com/wp-plan",
            implement: "https://example.com/wp-implement",
            reopened_nudge: "https://example.com/wp-nudge",
          },
        },
        {
          github: "tall-agency/example-client-api",
          label: "tall-agency/example-client-api",
          default_branch: "main",
          theme_path: null,
          cursor_webhooks: {
            plan: "https://example.com/api-plan",
            implement: "https://example.com/api-implement",
            reopened_nudge: "https://example.com/api-nudge",
          },
        },
      ],
    },
  },
};

describe("normalizeWebsiteUrl", () => {
  it("strips trailing slash and lowercases host", () => {
    assert.equal(
      normalizeWebsiteUrl("https://TallDevStg.wpenginepowered.com/"),
      "https://talldevstg.wpenginepowered.com"
    );
  });

  it("adds https when missing", () => {
    assert.equal(
      normalizeWebsiteUrl("talldevstg.wpenginepowered.com"),
      "https://talldevstg.wpenginepowered.com"
    );
  });
});

describe("resolveSiteAndRepo", () => {
  it("errors when Website URL missing", () => {
    const r = resolveSiteAndRepo(registry, null, null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "missing_website_url");
  });

  it("errors on unknown Website URL", () => {
    const r = resolveSiteAndRepo(registry, "https://unknown.example", null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "unknown_website_url");
  });

  it("auto-selects sole repo when Repo blank", () => {
    const r = resolveSiteAndRepo(
      registry,
      "https://talldevstg.wpenginepowered.com",
      null
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.repo.github, "Tall-Agency/dev-automation-test");
      assert.equal(r.autoSelectedRepo, true);
    }
  });

  it("uses explicit Repo on single-repo site", () => {
    const r = resolveSiteAndRepo(
      registry,
      "https://talldevstg.wpenginepowered.com",
      "Tall-Agency/dev-automation-test"
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.autoSelectedRepo, false);
  });

  it("requires Repo when site has multiple repos", () => {
    const r = resolveSiteAndRepo(registry, "https://example-client.com", "");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "missing_repo_multi");
  });

  it("routes multi-repo site with valid Repo", () => {
    const r = resolveSiteAndRepo(
      registry,
      "https://example-client.com",
      "tall-agency/example-client-api"
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.repo.github, "tall-agency/example-client-api");
      assert.equal(r.site.slug, "example-client");
    }
  });

  it("rejects Repo not belonging to Website URL", () => {
    const r = resolveSiteAndRepo(
      registry,
      "https://talldevstg.wpenginepowered.com",
      "tall-agency/example-client-api"
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_repo");
  });
});

describe("eventToPhase", () => {
  it("maps events to phases", () => {
    assert.equal(eventToPhase("ticket_created"), "plan");
    assert.equal(eventToPhase("note_added"), "implement");
    assert.equal(eventToPhase("ticket_reopened"), "reopened_nudge");
    assert.equal(eventToPhase("other"), null);
  });
});
