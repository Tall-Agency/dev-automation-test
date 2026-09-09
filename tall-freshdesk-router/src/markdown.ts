/**
 * Minimal Markdown to HTML renderer for Freshdesk note bodies.
 *
 * Freshdesk treats a note body as HTML, so Markdown arrives as one unbroken
 * paragraph with literal `##` and `**` in it. Agents write Markdown whatever
 * the prompt says, so converting here means every caller gets a readable note
 * without having to hand-assemble HTML.
 *
 * This deliberately covers only what the agents actually emit. Two constraints
 * shape it:
 *
 * - Freshdesk strips heading tags from note bodies, so headings render as bold
 *   blocks rather than <h2>.
 * - There is no stylesheet behind a note, so tables carry inline borders.
 *
 * Underscore emphasis is not supported on purpose: paths like `_blocks.scss`
 * are common in these notes and would otherwise turn into italics.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inline spans, on already-escaped text. Code is extracted first and put back
 * last so that formatting inside a code span stays literal.
 */
function renderInline(escaped: string): string {
  const codeSpans: string[] = [];
  let out = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code);
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });

  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) =>
      /^(https?:|mailto:)/i.test(href)
        ? `<a href="${href}">${label}</a>`
        : label
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  return out.replace(
    /\u0000CODE(\d+)\u0000/g,
    (_m, i: string) =>
      `<code style="background:#f2f2f2;padding:1px 4px;border-radius:3px">${
        codeSpans[Number(i)]
      }</code>`
  );
}

const CELL_STYLE =
  "border:1px solid #d0d0d0;padding:6px 10px;text-align:left;vertical-align:top";

function isTableDivider(line: string): boolean {
  return /^\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    // Fenced code block.
    if (/^```/.test(trimmed)) {
      flushParagraph();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(escapeHtml(lines[i]));
        i++;
      }
      html.push(
        `<pre style="background:#f2f2f2;padding:10px;border-radius:4px;` +
          `white-space:pre-wrap"><code>${code.join("\n")}</code></pre>`
      );
      continue;
    }

    // Horizontal rule, before the list check so `---` is not read as a bullet.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr style="border:0;border-top:1px solid #ddd">');
      continue;
    }

    // Table: a header row followed by a divider.
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1].trim())
    ) {
      flushParagraph();
      const head = splitRow(trimmed);
      i += 2;

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      i--;

      const headHtml = head
        .map(
          (cell) =>
            `<th style="${CELL_STYLE};background:#f7f7f7">${renderInline(
              escapeHtml(cell)
            )}</th>`
        )
        .join("");
      const bodyHtml = rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td style="${CELL_STYLE}">${renderInline(
                    escapeHtml(cell)
                  )}</td>`
              )
              .join("")}</tr>`
        )
        .join("");

      html.push(
        `<table style="border-collapse:collapse;margin:8px 0">` +
          `<thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      html.push(
        `<div style="margin:14px 0 4px"><strong>${renderInline(
          escapeHtml(heading[2])
        )}</strong></div>`
      );
      continue;
    }

    // List: consume every following line at the same kind of marker.
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || ordered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      const items: string[] = [];

      while (i < lines.length) {
        const item = lines[i].trim();
        const match = bullet
          ? /^[-*]\s+(.*)$/.exec(item)
          : /^\d+[.)]\s+(.*)$/.exec(item);
        if (!match) break;
        items.push(
          `<li style="margin:2px 0">${renderInline(
            escapeHtml(match[1])
          )}</li>`
        );
        i++;
      }
      i--;

      html.push(
        `<${tag} style="margin:6px 0;padding-left:22px">${items.join("")}</${tag}>`
      );
      continue;
    }

    paragraph.push(renderInline(escapeHtml(line.trim())));
  }

  flushParagraph();
  return html.join("\n");
}
