import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { webhookForPhase } from "../src/cursor.ts";
import type { RepoEntry, SiteRegistry } from "../src/types.ts";

const sharedRegistry: SiteRegistry = {
  freshdesk_fields: {
    website_url: "cf_website_url",
    repo: "cf_repo",
  },
  shared_cursor_webhooks: {
    plan: "https://shared.example/plan",
    implement: "https://shared.example/implement",
    reopened_nudge: "https://shared.example/nudge",
  },
  sites: {},
};

const baseRepo: RepoEntry = {
  github: "Tall-Agency/example",
  label: "Tall-Agency/example",
  default_branch: "staging",
  theme_path: "web/app/themes/example",
};

describe("webhookForPhase (shared Route 1)", () => {
  it("uses shared_cursor_webhooks when repo has no override", () => {
    assert.equal(
      webhookForPhase(sharedRegistry, baseRepo, "plan"),
      "https://shared.example/plan"
    );
    assert.equal(
      webhookForPhase(sharedRegistry, baseRepo, "implement"),
      "https://shared.example/implement"
    );
  });

  it("prefers per-repo override when set", () => {
    const repo: RepoEntry = {
      ...baseRepo,
      cursor_webhooks: {
        plan: "https://override.example/plan",
        implement: "https://override.example/implement",
        reopened_nudge: "https://override.example/nudge",
      },
    };
    assert.equal(
      webhookForPhase(sharedRegistry, repo, "plan"),
      "https://override.example/plan"
    );
  });

  it("returns empty string when neither shared nor override exists", () => {
    const empty: SiteRegistry = {
      freshdesk_fields: { website_url: "cf_website_url", repo: "cf_repo" },
      sites: {},
    };
    assert.equal(webhookForPhase(empty, baseRepo, "plan"), "");
  });
});
