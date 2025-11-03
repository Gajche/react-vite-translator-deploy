// src/lib/docxExporter.ts
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  PageOrientation,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";

/**
 * TRADOS / Word formatting exporter
 *
 * - Times New Roman 12pt body (size: 24)
 * - Headings: centered bold 12pt
 * - Paragraph spacing: 6pt before & 6pt after
 * - Hanging indent: 1 cm for all paragraphs and list items
 * - Left indent: 1 cm (so hanging indent visually matches TRADOS)
 * - Page margins: Top/Bottom 2.54cm; Left/Right 3.17cm
 * - Tables: borders, header background, 10pt font
 */

/* Helpers */
const CM_TO_TWIPS = (cm: number) => Math.round((1440 / 2.54) * cm); // 1 cm -> twips
const PT_TO_DOCX_SIZE = (pt: number) => Math.round(pt * 2); // docx size uses half-points

function inlineRunsFromText(text: string) {
  // Convert very simple inline markdown to runs: **bold**, *italic*
  const runs: TextRun[] = [];
  // Process bold first
  const boldPattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m;
  const pieces: Array<{ text: string; bold?: boolean }> = [];

  while ((m = boldPattern.exec(text)) !== null) {
    if (m.index > last) pieces.push({ text: text.slice(last, m.index) });
    pieces.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last === 0) pieces.push({ text });
  else if (last < text.length) pieces.push({ text: text.slice(last) });

  for (const p of pieces) {
    if (p.bold) {
      runs.push(
        new TextRun({
          text: p.text,
          bold: true,
          size: PT_TO_DOCX_SIZE(12),
          font: "Times New Roman",
        })
      );
    } else {
      // process italics inside
      const italicPattern = /\*(.+?)\*/g;
      let last2 = 0;
      let mm;
      while ((mm = italicPattern.exec(p.text)) !== null) {
        if (mm.index > last2) {
          runs.push(
            new TextRun({
              text: p.text.slice(last2, mm.index),
              size: PT_TO_DOCX_SIZE(12),
              font: "Times New Roman",
            })
          );
        }
        runs.push(
          new TextRun({
            text: mm[1],
            italics: true,
            size: PT_TO_DOCX_SIZE(12),
            font: "Times New Roman",
          })
        );
        last2 = mm.index + mm[0].length;
      }
      if (last2 === 0) {
        runs.push(
          new TextRun({
            text: p.text,
            size: PT_TO_DOCX_SIZE(12),
            font: "Times New Roman",
          })
        );
      } else if (last2 < p.text.length) {
        runs.push(
          new TextRun({
            text: p.text.slice(last2),
            size: PT_TO_DOCX_SIZE(12),
            font: "Times New Roman",
          })
        );
      }
    }
  }

  return runs.length
    ? runs
    : [new TextRun({ text, size: PT_TO_DOCX_SIZE(12) })];
}

/** Detects whether paragraph is a table JSON created by your HTML exporter */
function tryParseTableParagraph(p: string) {
  const t = p.trim();
  if (!t.startsWith("{")) return null;
  try {
    const data = JSON.parse(t);
    if (
      data?.headers &&
      Array.isArray(data.headers) &&
      Array.isArray(data.rows)
    ) {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

/** Detect numbered/lettered markers — expects TAB after marker in your TRADOS text */
function extractMarker(text: string) {
  // Accept forms: "(a)\t", "(1)\t", "1.\t", "a.\t"
  const m = text.match(
    /^(\([0-9a-zA-Z]+\)|\d+\.|[a-zA-Z]\.)\t?(?:\s*)([\s\S]*)$/
  );
  if (m) {
    const rawMarker = m[1];
    const rest = m[2] ?? "";
    // Ensure there's a tab after markers per TRADOS rules
    let marker = rawMarker;
    if (!marker.endsWith("\t")) marker = marker + "\t";
    return { marker, rest: rest.trim() };
  }
  return null;
}

/* Main export function */
export async function exportToDOCX(
  content: string,
  sourceLang: string,
  targetLang: string,
  metadata?: { title?: string; author?: string; description?: string }
): Promise<Blob> {
  // Split into TRADOS-like paragraphs (double newline = new para)
  const paras = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const children: any[] = [];

  // Title block (centered, bold, 12pt as requested by TRADOS for headings)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            metadata?.title ||
            `Translation ${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`,
          bold: true,
          size: PT_TO_DOCX_SIZE(12),
          font: "Times New Roman",
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    })
  );

  // Small metadata (non-intrusive)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Source: ${sourceLang.toUpperCase()}    Target: ${targetLang.toUpperCase()}`,
          size: PT_TO_DOCX_SIZE(10),
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 120 },
    })
  );

  // Content heading
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Translated Content",
          bold: true,
          size: PT_TO_DOCX_SIZE(12),
          font: "Times New Roman",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      spacing: { before: 120, after: 120 },
    })
  );

  // Process paragraphs
  for (const p of paras) {
    const table = tryParseTableParagraph(p);
    if (table) {
      // Build table with header shading and 10pt font
      const headerCells = table.headers.map(
        (h: string) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(h),
                    bold: true,
                    size: PT_TO_DOCX_SIZE(10),
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
            shading: {
              type: ShadingType.CLEAR,
              color: "000000",
              fill: "E6E6E6", // light gray header background
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            width: {
              size: Math.round(100 / table.headers.length),
              type: WidthType.PERCENTAGE,
            },
          })
      );
      const rows: TableRow[] = [new TableRow({ children: headerCells })];

      for (const r of table.rows) {
        const cells = r.map(
          (cell: any) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(cell),
                      size: PT_TO_DOCX_SIZE(10),
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
              width: {
                size: Math.round(100 / table.headers.length),
                type: WidthType.PERCENTAGE,
              },
            })
        );
        rows.push(new TableRow({ children: cells }));
      }

      children.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      continue;
    }

    // Heading heuristics: short line or "ALL CAPS" => heading centered bold 12pt
    const isShort = p.length <= 100;
    const uppercaseLetters = (p.match(/[A-ZА-ЯČĆŽŠĐŁØ]/g) || []).length;
    const uppercaseRatio = uppercaseLetters / Math.max(1, p.length);
    if (isShort && uppercaseRatio > 0.3) {
      children.push(
        new Paragraph({
          children: inlineRunsFromText(p),
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          heading: HeadingLevel.HEADING_1,
        })
      );
      continue;
    }

    // Article heading detection (Član, Член, Članak, Article)
    if (/^(Член|Član|Članak|Article)\b/i.test(p)) {
      children.push(
        new Paragraph({
          children: inlineRunsFromText(p),
          alignment: AlignmentType.LEFT,
          spacing: { before: 60, after: 120 },
          heading: HeadingLevel.HEADING_3,
        })
      );
      continue;
    }

    // Numbered / lettered marker detection — preserve marker and add ONE TAB (TRADOS rule)
    const maybe = extractMarker(p);
    if (maybe) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 6, after: 6 },
          indent: { left: CM_TO_TWIPS(1), hanging: CM_TO_TWIPS(1) },
          children: [
            new TextRun({
              text: maybe.marker,
              size: PT_TO_DOCX_SIZE(12),
              font: "Times New Roman",
            }),
            ...inlineRunsFromText(maybe.rest),
          ],
        })
      );
      continue;
    }

    // Default body paragraph — apply TRADOS paragraph rules
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 6, after: 6 },
        indent: { left: CM_TO_TWIPS(1), hanging: CM_TO_TWIPS(1) },
        children: inlineRunsFromText(p),
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: {
              top: CM_TO_TWIPS(2.54),
              bottom: CM_TO_TWIPS(2.54),
              left: CM_TO_TWIPS(3.17),
              right: CM_TO_TWIPS(3.17),
            },
          },
        },
        children,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Times New Roman", size: PT_TO_DOCX_SIZE(12) },
          paragraph: { spacing: { before: 6, after: 6 } },
        },
        {
          id: "Footnote",
          name: "Footnote",
          run: { font: "Times New Roman", size: PT_TO_DOCX_SIZE(10) },
        },
      ],
    },
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
