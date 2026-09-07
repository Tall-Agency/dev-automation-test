# Cloudflare UI deploy (Option A - Quick Edit)

Use the bundled file: **[worker.js](worker.js)** (~15 KB).

Cursor webhook URLs are still placeholders until you create Automations later - routing will fail until those are filled and you re-paste an updated bundle (or we update and you paste again).

---

## 1. Create the Worker

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. **Create** → **Create Worker**
3. Name: `tall-freshdesk-router`
4. Click **Deploy** (default hello-world is fine for now)

## 2. Paste the code

1. On the Worker page, click **Edit code** (or **Quick edit**)
2. Delete all existing editor contents
3. Open locally:  
   `tall-freshdesk-router/cloudflare-ui/worker.js`
4. Select all → copy → paste into the Cloudflare editor
5. Confirm the editor is in **ES modules** mode if there is a toggle (default on new Workers)
6. **Save and deploy**

## 3. Add secrets

Worker → **Settings** → **Variables and Secrets** → **Add** → type **Secret**:

| Name | Value |
|------|--------|
| `FRESHDESK_API_KEY` | Your Freshdesk API key (Profile → API Key) |
| `FRESHDESK_DOMAIN` | `help.tall.agency` |
| `CURSOR_WEBHOOK_SECRET` | Long random string (save it - agents need the same later as `FRESHDESK_ROUTER_SECRET`) |
| `WEBHOOK_SHARED_SECRET` | Another long random string (optional but recommended for Freshdesk → Worker) |

Save each secret.

## 4. Smoke test

Open in a browser or run:

```bash
curl https://tall-freshdesk-router.<YOUR_SUBDOMAIN>.workers.dev/health
```

Expect something like:

```json
{ "ok": true, "service": "tall-freshdesk-router", "io_mode": "worker" }
```

Copy your full Worker base URL (without `/health`) and send it back here.

## 5. After health works (next with me)

1. Create 3 Cursor Automations → get webhook URLs  
2. Update `site-registry.json` → rebuild `cloudflare-ui/worker.js` → paste again  
3. Freshdesk automation rules → `POST https://…/webhook`
