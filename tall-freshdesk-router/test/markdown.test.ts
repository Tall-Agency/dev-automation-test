import { strict as assert } from "node:assert";
import { test } from "node:test";

import { markdownToHtml } from "../src/markdown.ts";

test("headings become bold blocks, since Freshdesk strips heading tags", () => {
  const html = markdownToHtml("## Freshdesk #264 - Slider padding");
  assert.match(html, /<strong>Freshdesk #264 - Slider padding<\/strong>/);
  assert.doesNotMatch(html, /<h2/);
});

test("bullet and numbered lists become real lists", () => {
  const bullets = markdownToHtml("- one\n- two");
  assert.match(bullets, /<ul[^>]*><li[^>]*>one<\/li><li[^>]*>two<\/li><\/ul>/);

  const ordered = markdownToHtml("1. first\n2. second");
  assert.match(ordered, /<ol[^>]*><li[^>]*>first<\/li>/);
});

test("consecutive list items collapse into one list", () => {
  const html = markdownToHtml("- a\n- b\n- c");
  assert.equal(html.match(/<ul/g)?.length, 1);
  assert.equal(html.match(/<li/g)?.length, 3);
});

test("tables render with borders, because notes have no stylesheet", () => {
  const html = markdownToHtml(
    "| Check | Result |\n|-------|--------|\n| Repo | Match |"
  );
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Check<\/th>/);
  assert.match(html, /<td[^>]*>Match<\/td>/);
  assert.match(html, /border:1px solid/);
});

test("bold and inline code render inside a paragraph", () => {
  const html = markdownToHtml("The **logo slider** uses `--space-section`.");
  assert.match(html, /<strong>logo slider<\/strong>/);
  assert.match(html, /<code[^>]*>--space-section<\/code>/);
});

test("underscores in filenames survive, rather than turning into italics", () => {
  const html = markdownToHtml("Edit `src/scss/blocks/_blocks.scss` now.");
  assert.match(html, /_blocks\.scss/);
  assert.doesNotMatch(html, /<em>/);
});

test("markdown inside a code span stays literal", () => {
  const html = markdownToHtml("Use `**not bold**` here");
  assert.doesNotMatch(html, /<strong>/);
  assert.match(html, /\*\*not bold\*\*/);
});

test("http links render, other schemes are dropped to their label", () => {
  const ok = markdownToHtml("[staging](https://talldevstg.wpenginepowered.com)");
  assert.match(ok, /<a href="https:\/\/talldevstg\.wpenginepowered\.com">staging<\/a>/);

  const unsafe = markdownToHtml("[click](javascript:alert(1))");
  assert.doesNotMatch(unsafe, /<a /);
  assert.match(unsafe, /click/);
});

test("HTML in the source is escaped, not executed", () => {
  const html = markdownToHtml("Renders <script>alert(1)</script> and 5 > 3");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /5 &gt; 3/);
});

test("a horizontal rule is not mistaken for a bullet", () => {
  const html = markdownToHtml("above\n\n---\n\nbelow");
  assert.match(html, /<hr/);
  assert.doesNotMatch(html, /<ul/);
});

test("blank lines separate paragraphs, single newlines break lines", () => {
  const html = markdownToHtml("one\ntwo\n\nthree");
  assert.match(html, /<p>one<br>two<\/p>/);
  assert.match(html, /<p>three<\/p>/);
});

test("fenced code blocks are preserved", () => {
  const html = markdownToHtml("```\nnpm run build\n```");
  assert.match(html, /<pre[^>]*><code>npm run build<\/code><\/pre>/);
});

test("the real note from ticket 264 renders as structured HTML", () => {
  const html = markdownToHtml(
    [
      "## Freshdesk #264 - Slider padding",
      "",
      "### Understanding",
      "The ticket reports excessive vertical padding around the **logo slider**.",
      "",
      "### Proposed fix",
      "- **Option A (recommended):** `var(--space-xl)` - 80px",
      "- **Option B (minimal):** `var(--space-lg)` - 48px",
    ].join("\n")
  );

  assert.match(html, /<strong>Freshdesk #264 - Slider padding<\/strong>/);
  assert.match(html, /<ul/);
  assert.equal(html.match(/<li/g)?.length, 2);
  // The wall-of-text symptom: no raw markers left in the output.
  assert.doesNotMatch(html, /\*\*/);
  assert.doesNotMatch(html, /^#/m);
});
