import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, LevelFormat, BorderStyle, Header, Footer, SimpleField,
  NumberFormat, SectionType, FootnoteReferenceRun,
} from "docx";
import { getConfig } from "./config";

// ── Constants ─────────────────────────────────────────────────────────────────
const PT   = (n: number) => n * 2;           // docx half-points
const DXA  = (inches: number) => inches * 1440;

const COLOR_BODY   = "1C1C1C";
const COLOR_HEAD   = "1A1A1A";
const COLOR_ACCENT = "7C5C3E";   // warm brown
const COLOR_RULE   = "C8B99A";   // tan rule line
const COLOR_CITE   = "7C5C3E";   // scripture citation

// Module-level default — overridden at runtime by PlatformConfig inside buildBookDocx
let FONT = "Georgia";

// ── Scripture reference detector ──────────────────────────────────────────────
// Matches: John 3:16  |  1 Cor. 13:4-7  |  Psalm 23:1  |  Rev. 22:20-21
// Also matches with trailing translation: (John 3:16, KJV) or — Romans 8:28 NLT
const SCRIPTURE_INLINE_RE =
  /\b((?:1|2|3)\s)?([A-Z][a-z]+(?:\.|s)?)\s(\d+):(\d+(?:-\d+)?)(?:\s?(?:,\s?)?(KJV|NLT|NKJV|NIV|ESV|Passion|MSG|NASB|AMP))?\b/g;

// Matches a standalone scripture ref line (Tier 1 citation after a block quote)
// e.g.  "— John 3:16, KJV"  or  "John 3:16 KJV"  or  "(Romans 8:28)"
const SCRIPTURE_CITE_LINE_RE =
  /^[\u2014\-\s]*\(?((?:1|2|3)\s)?([A-Z][a-z]+(?:\.|s)?)\s(\d+):(\d+(?:-\d+)?)(?:\s?[,\s]?\s?(KJV|NLT|NKJV|NIV|ESV|Passion|MSG|NASB|AMP))?\)?\.?$/;

// Known Bible book abbreviations to avoid false positives
const BIBLE_BOOKS = new Set([
  "Genesis","Gen","Exodus","Exod","Leviticus","Lev","Numbers","Num",
  "Deuteronomy","Deut","Joshua","Josh","Judges","Judg","Ruth",
  "Samuel","Kings","Chronicles","Ezra","Nehemiah","Neh","Esther","Est",
  "Job","Psalm","Psalms","Proverbs","Prov","Ecclesiastes","Eccl",
  "Isaiah","Isa","Jeremiah","Jer","Lamentations","Lam","Ezekiel","Ezek",
  "Daniel","Dan","Hosea","Hos","Joel","Amos","Obadiah","Jonah","Micah",
  "Nahum","Habakkuk","Hab","Zephaniah","Zeph","Haggai","Hag","Zechariah","Zech","Malachi","Mal",
  "Matthew","Matt","Mark","Luke","John","Acts","Romans","Rom",
  "Corinthians","Cor","Galatians","Gal","Ephesians","Eph","Philippians","Phil",
  "Colossians","Col","Thessalonians","Thess","Timothy","Tim","Titus","Philemon",
  "Hebrews","Heb","James","Peter","Pet","Jude","Revelation","Rev",
]);

function isBibleBook(word: string): boolean {
  return BIBLE_BOOKS.has(word.replace(/\.$/, ""));
}

// ── Footnote registry ─────────────────────────────────────────────────────────
// Global per-document — keyed by integer ID starting at 1
// Key 0 is reserved by docx for the separator

type FootnoteMap = Record<number, { children: Paragraph[] }>;

class FootnoteRegistry {
  private counter = 1;
  private map: FootnoteMap = {};

  add(text: string): number {
    const id = this.counter++;
    this.map[id] = {
      children: [
        new Paragraph({
          children: [new TextRun({ text, font: FONT, size: PT(9), color: COLOR_BODY })],
        }),
      ],
    };
    return id;
  }

  get(): FootnoteMap {
    return this.map;
  }

  hasAny(): boolean {
    return this.counter > 1;
  }
}

// ── Inline parser with Tier 2 footnotes ──────────────────────────────────────
// Returns TextRun[] + FootnoteReferenceRun[] for inline scripture detection
function parseInline(text: string, fn: FootnoteRegistry, translation: string): (TextRun | FootnoteReferenceRun)[] {
  const runs: (TextRun | FootnoteReferenceRun)[] = [];

  // First handle bold/italic markup splits, then scripture within each segment
  const markupParts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of markupParts) {
    const isBold    = part.startsWith("**") && part.endsWith("**");
    const isItalic  = part.startsWith("*")  && part.endsWith("*") && !isBold;
    const plainText = isBold ? part.slice(2, -2) : isItalic ? part.slice(1, -1) : part;

    if (!plainText) continue;

    // Scan for Tier 2 scripture references within this segment
    let lastIndex = 0;
    const re = new RegExp(SCRIPTURE_INLINE_RE.source, "g");
    let match: RegExpExecArray | null;

    while ((match = re.exec(plainText)) !== null) {
      const bookWord = (match[1] ? match[1].trim() + " " + match[2] : match[2]).trim();
      if (!isBibleBook(match[2].replace(/\.$/, ""))) continue;

      // Text before this match
      if (match.index > lastIndex) {
        runs.push(new TextRun({
          text: plainText.slice(lastIndex, match.index),
          font: FONT, size: PT(12), bold: isBold, italics: isItalic, color: COLOR_BODY,
        }));
      }

      // The scripture reference itself (not replaced — stays visible)
      const refText  = match[0];
      const transTag = match[5] ?? translation;
      const fnText   = `${bookWord} ${match[3]}:${match[4]}, ${transTag}`;
      const fnId     = fn.add(fnText);

      runs.push(new TextRun({
        text: refText,
        font: FONT, size: PT(12), bold: isBold, italics: isItalic, color: COLOR_BODY,
      }));
      runs.push(new FootnoteReferenceRun(fnId));

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    if (lastIndex < plainText.length) {
      runs.push(new TextRun({
        text: plainText.slice(lastIndex),
        font: FONT, size: PT(12), bold: isBold, italics: isItalic, color: COLOR_BODY,
      }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: "", font: FONT, size: PT(12) })];
}

// ── Text → Paragraph parser ───────────────────────────────────────────────────
function parseTextToParas(
  text: string,
  bulletRef: string,
  fn: FootnoteRegistry,
  translation: string,
): Paragraph[] {
  const lines  = text.split("\n");
  const paras: Paragraph[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw  = lines[i].trimEnd();
    const line = raw;

    // Empty line → small spacer
    if (!line.trim()) {
      paras.push(spacer(60, 60));
      i++;
      continue;
    }

    // H2 heading (##)
    if (line.startsWith("## ")) {
      paras.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: line.slice(3).trim(), font: FONT, color: COLOR_ACCENT, bold: true, size: PT(14) })],
        spacing: { before: 320, after: 160 },
      }));
      i++;
      continue;
    }

    // H3 heading (###)
    if (line.startsWith("### ")) {
      paras.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: line.slice(4).trim(), font: FONT, color: COLOR_HEAD, bold: true, size: PT(12) })],
        spacing: { before: 240, after: 120 },
      }));
      i++;
      continue;
    }

    // Bullet
    if (line.match(/^[-•*]\s+/)) {
      const content = line.replace(/^[-•*]\s+/, "");
      paras.push(new Paragraph({
        numbering: { reference: bulletRef, level: 0 },
        children: parseInline(content, fn, translation),
        spacing: { before: 80, after: 80 },
      }));
      i++;
      continue;
    }

    // ── Tier 1: scripture block quote ─────────────────────────────────────────
    // Triggered by "> " prefix
    if (line.startsWith("> ")) {
      const quoteText = line.slice(2).trim();

      // Collect consecutive quote lines
      const quoteLines = [quoteText];
      i++;
      while (i < lines.length && lines[i].trimEnd().startsWith("> ")) {
        quoteLines.push(lines[i].trimEnd().slice(2).trim());
        i++;
      }

      // Check if the very next non-empty line is a standalone citation
      let citationLine = "";
      let nextI = i;
      while (nextI < lines.length && !lines[nextI].trim()) nextI++;
      if (nextI < lines.length && SCRIPTURE_CITE_LINE_RE.test(lines[nextI].trim())) {
        citationLine = lines[nextI].trim();
        i = nextI + 1;
      }

      // If no explicit citation line, try to detect reference inside the last quote line
      if (!citationLine) {
        const lastLine = quoteLines[quoteLines.length - 1];
        const inlineMatch = SCRIPTURE_CITE_LINE_RE.exec(lastLine.replace(/^.*—\s*/, "— "));
        if (inlineMatch) citationLine = lastLine.replace(/^.*—\s*/, "— ");
      }

      // Render quote paragraph(s)
      for (const ql of quoteLines) {
        paras.push(new Paragraph({
          indent: { left: DXA(0.5), right: DXA(0.5) },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_ACCENT, space: 8 } },
          children: [new TextRun({ text: ql, font: FONT, size: PT(11), italics: true, color: "4A4A4A" })],
          spacing: { before: citationLine ? 120 : 160, after: citationLine ? 0 : 160 },
        }));
      }

      // Tier 1 citation rendered as right-aligned line below the quote
      if (citationLine) {
        const cleanCite = citationLine.replace(/^[\u2014\-\s]+/, "\u2014 ").trim();
        paras.push(new Paragraph({
          alignment: AlignmentType.RIGHT,
          indent: { right: DXA(0.5) },
          spacing: { before: 40, after: 160 },
          children: [new TextRun({ text: cleanCite, font: FONT, size: PT(9), color: COLOR_CITE, italics: true })],
        }));
      }

      continue;
    }

    // Normal paragraph — run through Tier 2 detector
    paras.push(new Paragraph({
      children: parseInline(line, fn, translation),
      spacing: { before: 120, after: 120 },
      alignment: AlignmentType.JUSTIFIED,
    }));
    i++;
  }

  return paras;
}

// ── Structural helpers ────────────────────────────────────────────────────────
function rule(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_RULE, space: 4 } },
    spacing: { before: 240, after: 240 },
    children: [],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer(before = 240, after = 240): Paragraph {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function buildTitlePage(title: string, authorName: string, ministryName: string): Paragraph[] {
  return [
    spacer(DXA(1.5), 0),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
      children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: PT(26), bold: true, color: COLOR_HEAD })],
    }),
    rule(),
    spacer(480, 480),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: authorName, font: FONT, size: PT(14), color: COLOR_ACCENT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: ministryName, font: FONT, size: PT(11), color: "888888", italics: true })],
    }),
  ];
}

function buildSectionTitle(title: string): Paragraph[] {
  return [
    pageBreak(),
    spacer(DXA(0.5), 0),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      spacing: { before: 480, after: 120 },
      children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: PT(18), bold: true, color: COLOR_HEAD })],
    }),
    rule(),
  ];
}

function buildChapterHeading(number: number, title: string): Paragraph[] {
  const cleanTitle = title
    .replace(/^#+\s*/, "")
    .replace(/^CHAPTER\s+\d+[:.\s]+/i, "")
    .replace(/^Chapter\s+\d+[:.\s]+/i, "")
    .trim();

  return [
    pageBreak(),
    spacer(DXA(0.3), 0),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 240, after: 60 },
      children: [new TextRun({ text: `CHAPTER ${number}`, font: FONT, size: PT(10), color: COLOR_ACCENT, allCaps: true })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: cleanTitle || title, font: FONT, size: PT(22), bold: true, color: COLOR_HEAD })],
    }),
    rule(),
    spacer(120, 0),
  ];
}

function parseFrontBackMatter(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionNames = [
    "FOREWORD", "PREFACE", "INTRODUCTION",
    "CONCLUSION", "PRAYER", "ABOUT THE AUTHOR", "MINISTRY PAGE",
  ];
  let currentSection = "";
  let currentLines: string[] = [];

  for (const line of text.split("\n")) {
    const upper = line.replace(/^#+\s*/, "").trim().toUpperCase();
    const matched = sectionNames.find((s) => upper === s || upper.startsWith(s));
    if (matched) {
      if (currentSection) sections[currentSection] = currentLines.join("\n").trim();
      currentSection = matched;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentLines.join("\n").trim();
  return sections;
}

// ── Main export function ──────────────────────────────────────────────────────
export async function buildBookDocx(book: {
  title: string;
  number: number;
  translation: string;
  author: { name: string; credentials: string | null; bioText: string | null };
  programme: { ministry: { name: string } };
  chapters: Array<{
    chapterNumber: number; title: string | null;
    approvedText: string | null; draftText: string | null;
  }>;
  workflowSteps: Array<{ stepNumber: number; outputText: string | null }>;
}): Promise<Buffer> {
  // Read font and page size from PlatformConfig (DB-first, env fallback, default)
  FONT             = await getConfig("exportFont") || "Georgia"; // reassigns module var
  const exportSize = await getConfig("exportPageSize");   // default: letter

  // Page dimensions: letter = 12240×15840 DXA, a4 = 11906×16838 DXA
  const PAGE_WIDTH  = exportSize === "a4" ? 11906 : 12240;
  const PAGE_HEIGHT = exportSize === "a4" ? 16838 : 15840;

  const frontBackText = book.workflowSteps.find((s) => s.stepNumber === 5)?.outputText ?? "";
  const sections      = parseFrontBackMatter(frontBackText);
  const bulletRef     = "book-bullets";

  // One footnote registry for the entire document
  const fn = new FootnoteRegistry();

  // ── Styles ──────────────────────────────────────────────────────────────────
  const styles = {
    default: {
      document: { run: { font: FONT, size: PT(12), color: COLOR_BODY } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(22), bold: true, font: FONT, color: COLOR_HEAD },
        paragraph: { spacing: { before: 480, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(14), bold: true, font: FONT, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(12), bold: true, font: FONT, color: COLOR_HEAD },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  };

  // ── Numbering ───────────────────────────────────────────────────────────────
  const numbering = {
    config: [{
      reference: bulletRef,
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2013",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: DXA(0.375), hanging: DXA(0.25) } } },
      }],
    }],
  };

  // ── Header / Footer ─────────────────────────────────────────────────────────
  const pageHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_RULE, space: 4 } },
        spacing: { before: 0, after: 160 },
        children: [
          new TextRun({ text: book.title.split("\u2014")[0].trim(), font: FONT, size: PT(9), color: "999999", italics: true }),
          new TextRun({ text: "  \u2014  ", font: FONT, size: PT(9), color: "CCCCCC" }),
          new TextRun({ text: book.author.name, font: FONT, size: PT(9), color: "999999" }),
        ],
      }),
    ],
  });

  const pageFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR_RULE, space: 4 } },
        spacing: { before: 160, after: 0 },
        children: [new SimpleField("PAGE")],
      }),
    ],
  });

  const pageProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: DXA(1), right: DXA(1.25), bottom: DXA(1), left: DXA(1.25) },
    },
  };

  // ── Build all content (footnote registry fills as we go) ───────────────────

  // Front matter paragraphs
  const frontChildren: Paragraph[] = [];
  if (sections["FOREWORD"]) {
    frontChildren.push(...buildSectionTitle("Foreword"));
    frontChildren.push(spacer(120, 0));
    frontChildren.push(...parseTextToParas(sections["FOREWORD"], bulletRef, fn, book.translation));
  }
  if (sections["PREFACE"]) {
    frontChildren.push(...buildSectionTitle("Preface"));
    frontChildren.push(spacer(120, 0));
    frontChildren.push(...parseTextToParas(sections["PREFACE"], bulletRef, fn, book.translation));
  }
  if (sections["INTRODUCTION"]) {
    frontChildren.push(...buildSectionTitle("Introduction"));
    frontChildren.push(spacer(120, 0));
    frontChildren.push(...parseTextToParas(sections["INTRODUCTION"], bulletRef, fn, book.translation));
  }

  // Chapter body paragraphs
  const bodyChildren: Paragraph[] = [];
  const sortedChapters = [...book.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  for (const ch of sortedChapters) {
    const text = ch.approvedText ?? ch.draftText ?? "";
    if (!text.trim()) continue;
    bodyChildren.push(...buildChapterHeading(ch.chapterNumber, ch.title ?? `Chapter ${ch.chapterNumber}`));
    bodyChildren.push(...parseTextToParas(text, bulletRef, fn, book.translation));
  }

  // Back matter paragraphs
  const backChildren: Paragraph[] = [];
  if (sections["CONCLUSION"]) {
    backChildren.push(...buildSectionTitle("Conclusion"));
    backChildren.push(spacer(120, 0));
    backChildren.push(...parseTextToParas(sections["CONCLUSION"], bulletRef, fn, book.translation));
  }
  if (sections["PRAYER"]) {
    backChildren.push(...buildSectionTitle("Prayer"));
    backChildren.push(spacer(120, 0));
    backChildren.push(...parseTextToParas(sections["PRAYER"], bulletRef, fn, book.translation));
  }
  if (sections["ABOUT THE AUTHOR"]) {
    backChildren.push(...buildSectionTitle("About the Author"));
    backChildren.push(spacer(120, 0));
    backChildren.push(...parseTextToParas(sections["ABOUT THE AUTHOR"], bulletRef, fn, book.translation));
  }
  if (sections["MINISTRY PAGE"]) {
    backChildren.push(...buildSectionTitle("Graceway Fountain Ministries"));
    backChildren.push(spacer(120, 0));
    backChildren.push(...parseTextToParas(sections["MINISTRY PAGE"], bulletRef, fn, book.translation));
  }

  // ── Assemble document sections ─────────────────────────────────────────────
  const docSections = [];

  // 1. Title page — no header/footer, no page numbers
  docSections.push({
    properties: { ...pageProps, type: SectionType.NEXT_PAGE },
    children: buildTitlePage(book.title, book.author.name, book.programme.ministry.name),
  });

  // 2. Front matter — Roman numerals
  if (frontChildren.length > 0) {
    docSections.push({
      properties: {
        ...pageProps,
        type: SectionType.NEXT_PAGE,
        page: {
          ...pageProps.page,
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
        },
      },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: frontChildren,
    });
  }

  // 3. Body — Arabic numerals from 1
  if (bodyChildren.length > 0) {
    docSections.push({
      properties: {
        ...pageProps,
        type: SectionType.NEXT_PAGE,
        page: {
          ...pageProps.page,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: bodyChildren,
    });
  }

  // 4. Back matter — continues Arabic
  if (backChildren.length > 0) {
    docSections.push({
      properties: { ...pageProps, type: SectionType.NEXT_PAGE },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: backChildren,
    });
  }

  // ── Construct document ─────────────────────────────────────────────────────
  const doc = new Document({
    styles,
    numbering,
    sections: docSections,
    // Only attach footnotes if any were generated
    ...(fn.hasAny() ? { footnotes: fn.get() } : {}),
  });
  return Packer.toBuffer(doc);
}
