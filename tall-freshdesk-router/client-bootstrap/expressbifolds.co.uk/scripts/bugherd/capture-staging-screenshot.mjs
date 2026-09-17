/**
 * Capture a staging screenshot for a BugHerd task (HTTP basic auth).
 *
 * Usage (from repo root):
 *   source .env  # STAGING_BASIC_AUTH_USER / STAGING_BASIC_AUTH_PASSWORD
 *   TASK_URL=https://talldevstg.wpenginepowered.com/ \
 *     OUT_FILE=.bugherd-screenshots/task-1-staging.png \
 *     node scripts/bugherd/capture-staging-screenshot.mjs
 *
 * First run: cd scripts/bugherd && npm install
 */
import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

async function loadEnvFile() {
  try {
    const raw = await readFile(path.join(REPO_ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env optional if vars are exported
  }
}

await loadEnvFile();

const TASK_URL =
  process.env.TASK_URL ?? process.env.STAGING_URL ?? "https://talldevstg.wpenginepowered.com/";
const OUT_FILE =
  process.env.OUT_FILE ??
  path.join(REPO_ROOT, ".bugherd-screenshots", "staging-screenshot.png");
const USER = process.env.STAGING_BASIC_AUTH_USER ?? process.env.STAGING_HTTP_AUTH_USER;
const PASS =
  process.env.STAGING_BASIC_AUTH_PASSWORD ?? process.env.STAGING_HTTP_AUTH_PASSWORD;
const SELECTOR = process.env.SCREENSHOT_SELECTOR ?? "";
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH ?? 1440);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT ?? 900);
const WAIT_MS = Number(process.env.WAIT_MS ?? 3000);

if (!USER || !PASS) {
  console.error(
    "Missing STAGING_BASIC_AUTH_USER and STAGING_BASIC_AUTH_PASSWORD in .env or environment.",
  );
  process.exit(1);
}

await mkdir(path.dirname(OUT_FILE), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  httpCredentials: { username: USER, password: PASS },
});
const page = await context.newPage();

try {
  await page.goto(TASK_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (page.url().includes("wp-login") || page.url().includes("sign-in")) {
    throw new Error(`Auth failed or wrong URL — landed on ${page.url()}`);
  }
  if (WAIT_MS > 0) await page.waitForTimeout(WAIT_MS);

  if (SELECTOR) {
    const el = page.locator(SELECTOR).first();
    await el.waitFor({ state: "visible", timeout: 60_000 });
    await el.screenshot({ path: OUT_FILE });
  } else {
    await page.screenshot({ path: OUT_FILE, fullPage: false });
  }

  console.log(`Wrote ${OUT_FILE}`);
} finally {
  await context.close();
  await browser.close();
}
