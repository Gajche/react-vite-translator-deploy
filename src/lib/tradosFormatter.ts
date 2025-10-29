// src/lib/tradosFormatter.ts - UNIVERSAL CONTINUOUS TEXT PARSER
import { TradosRules } from "./supabase";

/* ---------- UNIVERSAL HELPERS ---------- */
const lineHeightMap: Record<string, string> = {
  single: "1.0",
  "1.5": "1.5",
  double: "2.0",
  "1.5 lines": "1.5",
};

const alignMap: Record<string, string> = {
  left: "left",
  right: "right",
  center: "center",
  justify: "justify",
};

const getLineHeight = (v: string) => lineHeightMap[v.toLowerCase()] ?? "1.0";
const getAlign = (v: string) => alignMap[v.toLowerCase()] ?? "left";

/* ---------- UNIVERSAL CLEANING ---------- */
export function cleanTextForTrados(text: string, rules: TradosRules): string {
  let out = text;

  if (rules.cleaning.removeOptionalHyphens) {
    out = out.replace(/\u00AD/g, "");
  }

  if (rules.cleaning.removeMultipleSpaces) {
    out = out.replace(/ {5}/g, " ");
    out = out.replace(/ {4}/g, " ");
    out = out.replace(/ {3}/g, " ");
    out = out.replace(/ {2}/g, " ");
  }

  return out.trim();
}

/* ---------- UNIVERSAL CONTINUOUS TEXT PARSER ---------- */
function parseContinuousLegalText(text: string, rules: TradosRules): string[] {
  console.log("=== CONTINUOUS PARSER DEBUG ===");
  console.log("Input text length:", text.length);
  console.log("First 500 chars:", text.substring(0, 500));

  const result: string[] = [];

  // Normalize whitespace
  let normalizedText = text.replace(/\s+/g, " ");

  // Split into lines first (for title/subtitle detection)
  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "";
  let subtitle = "";
  let bodyLines: string[] = [];

  if (lines.length > 0) {
    title = lines[0];
    if (lines.length > 1) {
      subtitle = lines[1];
      bodyLines = lines.slice(2);
    } else {
      bodyLines = [];
    }
  } else {
    bodyLines = [];
  }

  // Add title
  if (title) {
    const cleanedTitle = cleanTextForTrados(title, rules);
    result.push(`<p class="document-title">${escapeHtml(cleanedTitle)}</p>`);
  }

  // Add subtitle
  if (subtitle) {
    const cleanedSubtitle = cleanTextForTrados(subtitle, rules);
    result.push(
      `<p class="document-subtitle">${escapeHtml(cleanedSubtitle)}</p>`
    );
  }

  // Process body
  for (let line of bodyLines) {
    line = line.trim();
    if (!line) continue;

    let segment = cleanTextForTrados(line, rules);
    let cssClass = "normal";

    // Apply tab formatting
    if (rules.tabs.useTabsAfterManualNumbers) {
      segment = segment
        .replace(/^(\(\d+\))\s*/, "$1\t")
        .replace(/^(\d+\.)\s*/, "$1\t")
        .replace(/^(\([A-Za-zА-Яа-яα-ω]\))\s*/i, "$1\t")
        .replace(/^(—)\s*/, "$1\t");
    }

    // UNIVERSAL CLASSIFICATION
    if (/^\d+\./.test(segment)) {
      cssClass = "article-point";
    } else if (/^\(\d+\)/.test(segment)) {
      cssClass = "preamble-point";
    } else if (/^\([A-Za-zА-Яа-яα-ω]\)/i.test(segment)) {
      cssClass = "letter-point";
    } else if (/^—/.test(segment)) {
      cssClass = "bullet-point";
    } else if (segment.endsWith(":")) {
      cssClass = "section-header";
    } else if (/\b[A-Za-zА-Яа-яα-ω]+\s+\d+$/i.test(segment)) {
      cssClass = "article-title";
    }

    result.push(`<p class="${cssClass}">${escapeHtml(segment)}</p>`);
  }

  console.log("Final paragraphs:", result.length);
  return result;
}

/* ---------- ALTERNATIVE: SIMPLE LINE-BASED PARSER ---------- */
function parseSimpleLegalText(text: string, rules: TradosRules): string[] {
  if (text.includes("\n")) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const result: string[] = [];
    let title = lines[0] || "";
    let subtitle = lines.length > 1 ? lines[1] : "";
    let body = lines.slice(2);

    if (title) {
      result.push(
        `<p class="document-title">${escapeHtml(
          cleanTextForTrados(title, rules)
        )}</p>`
      );
    }
    if (subtitle) {
      result.push(
        `<p class="document-subtitle">${escapeHtml(
          cleanTextForTrados(subtitle, rules)
        )}</p>`
      );
    }

    for (let line of body) {
      let processed = cleanTextForTrados(line, rules);
      if (rules.tabs.useTabsAfterManualNumbers) {
        processed = processed
          .replace(/^(\(\d+\))\s*/, "$1\t")
          .replace(/^(\d+\.)\s*/, "$1\t")
          .replace(/^(\([A-Za-zА-Яа-яα-ω]\))\s*/i, "$1\t")
          .replace(/^(—)\s*/, "$1\t");
      }
      result.push(`<p class="normal">${escapeHtml(processed)}</p>`);
    }

    return result;
  }

  return parseContinuousLegalText(text, rules);
}

/* ---------- UNIVERSAL HTML EXPORT ---------- */
export function formatToTradosHTML(raw: string, rules: TradosRules): string {
  const cleaned = cleanTextForTrados(raw, rules);
  const css = {
    lineHeight: getLineHeight(rules.paragraph.lineSpacing),
    align: getAlign(rules.paragraph.alignment),
    indentLeft: rules.paragraph.indentLeft || 1.0,
    hanging: rules.paragraph.hangingIndent || 1.0,
    spacingBefore: rules.paragraph.spacingBefore || 6,
    spacingAfter: rules.paragraph.spacingAfter || 6,
    mainSize: rules.fonts.main.size || 12,
    footnoteSize: rules.fonts.footnotes.size || 10,
  };

  const bodyLines = parseSimpleLegalText(cleaned, rules);

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="utf-8">
<title>TRADOS Legal Document</title>
<style>
@page {
  size: A4 ${rules.margins.orientation || "portrait"};
  margin: ${rules.margins.top || 2.54}cm ${rules.margins.right || 3.17}cm ${
    rules.margins.bottom || 2.54
  }cm ${rules.margins.left || 3.17}cm;
  mso-header-margin: 1.27cm;
  mso-footer-margin: 1.27cm;
  mso-gutter: ${rules.margins.gutter || 0}cm;
}

body {
  font-family: 'Times New Roman', serif;
  font-size: ${css.mainSize}pt;
  line-height: ${css.lineHeight};
  margin: 0;
  padding: 0;
  text-align: ${css.align};
}

p {
  margin: ${css.spacingBefore}pt 0 ${css.spacingAfter}pt 0;
  text-align: ${css.align};
  line-height: ${css.lineHeight};
}

/* TITLE & SUBTITLE - ALWAYS BOLD & CENTERED */
p.document-title {
  font-weight: bold;
  text-align: center;
  font-size: 16pt;
  margin: 24pt 0 12pt 0;
  text-indent: 0;
}

p.document-subtitle {
  font-weight: bold;
  text-align: center;
  font-size: 0.9em;
  margin: 0 0 18pt 0;
  text-indent: 0;
}

/* REST OF STYLES */
p.document-date {
  text-align: center;
  margin: 6pt 0 6pt 0;
  text-indent: 0;
}

p.document-reference {
  text-align: center;
  font-style: italic;
  margin: 6pt 0 18pt 0;
  text-indent: 0;
}

p.institution-header {
  font-weight: bold;
  text-align: left;
  margin: 12pt 0 6pt 0;
  text-indent: 0;
}

p.section-header {
  font-weight: bold;
  text-align: left;
  margin: 12pt 0 6pt 0;
  text-indent: 0;
}

p.article-title {
  font-weight: bold;
  text-align: left;
  margin: 18pt 0 6pt 0;
  font-size: 14pt;
  text-indent: 0;
}

p.article-point {
  margin-left: ${css.indentLeft}cm;
  text-indent: -${css.hanging}cm;
  padding-left: ${css.hanging}cm;
}

p.preamble-point {
  margin-left: ${css.indentLeft}cm;
  text-indent: -${css.hanging}cm;
  padding-left: ${css.hanging}cm;
}

p.letter-point {
  margin-left: ${Number(css.indentLeft) + 0.5}cm;
  text-indent: -${css.hanging}cm;
  padding-left: ${css.hanging}cm;
}

p.bullet-point {
  margin-left: ${Number(css.indentLeft) + 1}cm;
  text-indent: -0.5cm;
  padding-left: 0.5cm;
}

p.signature-line {
  text-align: right;
  margin: 12pt 0 0 0;
  text-indent: 0;
}

p.normal {
  margin-left: ${css.indentLeft}cm;
  text-indent: -${css.hanging}cm;
  padding-left: ${css.hanging}cm;
}
</style>
</head>
<body>
${bodyLines.join("\n")}
</body>
</html>`;
}

/* ---------- HTML ESCAPE ---------- */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export for debugging
export { parseContinuousLegalText, parseSimpleLegalText };
