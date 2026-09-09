export type CursorPhase = "plan" | "implement" | "reopened_nudge";

export type IncomingEvent =
  | "ticket_created"
  | "note_added"
  | "ticket_reopened";

export interface CursorWebhooks {
  plan: string;
  implement: string;
  reopened_nudge: string;
}

export interface RepoEntry {
  github: string;
  label: string;
  default_branch: string;
  theme_path: string | null;
  cursor_webhooks: CursorWebhooks;
}

export interface SiteEntry {
  slug: string;
  staging_url: string;
  bugherd_project_id?: string | null;
  repos: RepoEntry[];
}

export interface SiteRegistry {
  freshdesk_fields: {
    website_url: string;
    repo: string;
    note?: string;
  };
  sites: Record<string, SiteEntry>;
}

export interface ResolveOk {
  ok: true;
  websiteUrl: string;
  site: SiteEntry;
  repo: RepoEntry;
  autoSelectedRepo: boolean;
}

export interface ResolveErr {
  ok: false;
  code:
    | "missing_website_url"
    | "unknown_website_url"
    | "missing_repo_multi"
    | "invalid_repo";
  message: string;
}

export type ResolveResult = ResolveOk | ResolveErr;

export interface FreshdeskConversation {
  id: number;
  body_text?: string;
  body?: string;
  incoming?: boolean;
  private?: boolean;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  source?: number;
  from_email?: string | null;
}

export interface FreshdeskTicket {
  id: number;
  subject?: string;
  status?: number;
  priority?: number;
  requester_id?: number;
  responder_id?: number | null;
  tags?: string[];
  custom_fields?: Record<string, string | number | boolean | null | undefined>;
  description_text?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Env {
  FRESHDESK_API_KEY: string;
  /** e.g. help.tall.agency or subdomain.freshdesk.com */
  FRESHDESK_DOMAIN: string;
  /**
   * Cursor automation tokens are scoped to a single automation, so each phase
   * needs its own. A token for the plan automation cannot trigger implement.
   */
  CURSOR_TOKEN_PLAN?: string;
  CURSOR_TOKEN_IMPLEMENT?: string;
  CURSOR_TOKEN_REOPENED_NUDGE?: string;
  /** Shared secret agents use to call /actions/*. Not a Cursor token. */
  ROUTER_ACTION_SECRET?: string;
  /** Legacy single-token fallback for all of the above. */
  CURSOR_WEBHOOK_SECRET?: string;
  WEBHOOK_SHARED_SECRET?: string;
  SITE_REGISTRY?: KVNamespace;
}

export interface EnrichedCursorPayload {
  phase: CursorPhase;
  event: IncomingEvent;
  /** Path 2: no Freshdesk MCP - use these for context and Worker action URLs for writes */
  io_mode: "worker";
  freshdesk: {
    ticket_id: number;
    website_url: string;
    repo: string;
    subject?: string;
    status?: number;
    tags?: string[];
    description_text?: string;
    custom_fields?: Record<string, string | number | boolean | null | undefined>;
    conversations: FreshdeskConversation[];
  };
  site: {
    slug: string;
    staging_url: string;
    bugherd_project_id: string | null;
  };
  repo: {
    github: string;
    default_branch: string;
    theme_path: string | null;
  };
  worker: {
    actions_base_url: string;
    note_path: "/actions/note";
    update_ticket_path: "/actions/update-ticket";
    auth: string;
    /**
     * Bearer token for this ticket only. Use this instead of a configured
     * secret - it needs nothing set up on the agent side.
     */
    action_token: string;
  };
}
