import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, LevelFormat, BorderStyle, Header, Footer, SimpleField,
  NumberFormat, SectionType,
} from "docx";

// ── Constants ─────────────────────────────────────────────────────────────────
const PT = (n: number) => n * 2;          // half-points
const DXA = (inches: number) => inches * 1440;

const FONT = "Georgia";
const COLOR_BODY = "1C1C1C";
const COLOR_HEADING = "1A1A1A";
const COLOR_ACCENT = "7C5C3E";   // warm brown — pastoral feel
const COLOR_RULE = "C8B99A";     // light tan rule line

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// Parse plain text output from Claude into Paragraph elements
// Handles: headings (##), bold (**text**), bullet lists (- or •), blank lines
function parseTextToParas(text: string, bulletRef: string): Paragraph[] {
  const lines = text.split("\n");
  const paras: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Skip empty
    if (!line.trim()) {
      paras.push(spacer(60, 60));
      continue;
    }

    // H2 heading (##)
    if (line.startsWith("## ")) {
      paras.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: line.slice(3).trim(), font: FONT, color: COLOR_ACCENT, bold: true, size: PT(14) })],
        spacing: { before: 320, after: 160 },
      }));
      continue;
    }

    // H3 heading (###)
    if (line.startsWith("### ")) {
      paras.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: line.slice(4).trim(), font: FONT, color: COLOR_HEADING, bold: true, size: PT(12) })],
        spacing: { before: 240, after: 120 },
      }));
      continue;
    }

    // Bullet list
    if (line.match(/^[-•*]\s+/)) {
      const content = line.replace(/^[-•*]\s+/, "");
      paras.push(new Paragraph({
        numbering: { reference: bulletRef, level: 0 },
        children: parseInline(content),
        spacing: { before: 80, after: 80 },
      }));
      continue;
    }

    // Scripture block quote (lines starting with "> " or all-caps verse references)
    if (line.startsWith("> ")) {
      paras.push(new Paragraph({
        indent: { left: DXA(0.5), right: DXA(0.5) },
        children: [new TextRun({
          text: line.slice(2),
          font: FONT, size: PT(11), italics: true, color: "4A4A4A",
        })],
        spacing: { before: 160, after: 160 },
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_ACCENT, space: 8 } },
      }));
      continue;
    }

    // Normal paragraph
    paras.push(new Paragraph({
      children: parseInline(line),
      spacing: { before: 120, after: 120 },
      alignment: AlignmentType.JUSTIFIED,
    }));
  }

  return paras;
}

// Parse inline formatting: **bold**, *italic*, plain
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), font: FONT, size: PT(12), bold: true, color: COLOR_BODY }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: FONT, size: PT(12), italics: true, color: COLOR_BODY }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: FONT, size: PT(12), color: COLOR_BODY }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "", font: FONT, size: PT(12) })];
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildTitlePage(title: string, authorName: string, ministryName: string): Paragraph[] {
  return [
    spacer(DXA(1.5), 0),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
      children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: PT(26), bold: true, color: COLOR_HEADING })],
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
      children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: PT(18), bold: true, color: COLOR_HEADING })],
    }),
    rule(),
  ];
}

function buildChapterHeading(number: number, title: string): Paragraph[] {
  // Extract clean title (strip "CHAPTER TITLE:" prefix patterns from AI output)
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
      children: [new TextRun({ text: cleanTitle || title, font: FONT, size: PT(22), bold: true, color: COLOR_HEADING })],
    }),
    rule(),
    spacer(120, 0),
  ];
}

function buildFrontMatterSection(sectionTitle: string, content: string, bulletRef: string): Paragraph[] {
  return [
    ...buildSectionTitle(sectionTitle),
    spacer(120, 0),
    ...parseTextToParas(content, bulletRef),
  ];
}

// Parse the front/back matter text (single blob) into named sections
function parseFrontBackMatter(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionNames = ["FOREWORD", "PREFACE", "INTRODUCTION", "CONCLUSION", "PRAYER", "ABOUT THE AUTHOR", "MINISTRY PAGE"];

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
  chapters: Array<{ chapterNumber: number; title: string | null; approvedText: string | null; draftText: string | null }>;
  workflowSteps: Array<{ stepNumber: number; outputText: string | null }>;
}): Promise<Buffer> {
  const frontBackText = book.workflowSteps.find((s) => s.stepNumber === 5)?.outputText ?? "";
  const sections = parseFrontBackMatter(frontBackText);

  const bulletRef = "book-bullets";

  // ── Document styles ─────────────────────────────────────────────────────────
  const styles = {
    default: {
      document: { run: { font: FONT, size: PT(12), color: COLOR_BODY } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(22), bold: true, font: FONT, color: COLOR_HEADING },
        paragraph: { spacing: { before: 480, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(14), bold: true, font: FONT, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(12), bold: true, font: FONT, color: COLOR_HEADING },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  };

  // ── Numbering config ────────────────────────────────────────────────────────
  const numbering = {
    config: [
      {
        reference: bulletRef,
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2013",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: DXA(0.375), hanging: DXA(0.25) } } },
        }],
      },
    ],
  };

  // ── Header / Footer ─────────────────────────────────────────────────────────
  const header = new Header({
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

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR_RULE, space: 4 } },
        spacing: { before: 160, after: 0 },
        children: [
          new SimpleField("PAGE"),
        ],
      }),
    ],
  });

  // ── Page properties ─────────────────────────────────────────────────────────
  const pageProps = {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: DXA(1), right: DXA(1.25), bottom: DXA(1), left: DXA(1.25) },
    },
  };

  // ── Assemble sections ───────────────────────────────────────────────────────
  const docSections = [];

  // 1. Title page (no header/footer)
  docSections.push({
    properties: {
      ...pageProps,
      type: SectionType.NEXT_PAGE,
      titlePage: false,
    },
    children: buildTitlePage(book.title, book.author.name, book.programme.ministry.name),
  });

  // 2. Front matter (with page numbers starting at i)
  const frontChildren: Paragraph[] = [];

  if (sections["FOREWORD"]) {
    frontChildren.push(...buildFrontMatterSection("Foreword", sections["FOREWORD"], bulletRef));
  }
  if (sections["PREFACE"]) {
    frontChildren.push(...buildFrontMatterSection("Preface", sections["PREFACE"], bulletRef));
  }
  if (sections["INTRODUCTION"]) {
    frontChildren.push(...buildFrontMatterSection("Introduction", sections["INTRODUCTION"], bulletRef));
  }

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
      headers: { default: header },
      footers: { default: footer },
      children: frontChildren,
    });
  }

  // 3. Chapter body (Arabic numerals from 1)
  const bodyChildren: Paragraph[] = [];

  const sortedChapters = [...book.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (const ch of sortedChapters) {
    const text = ch.approvedText ?? ch.draftText ?? "";
    if (!text.trim()) continue;

    const chTitle = ch.title ?? `Chapter ${ch.chapterNumber}`;
    bodyChildren.push(...buildChapterHeading(ch.chapterNumber, chTitle));
    bodyChildren.push(...parseTextToParas(text, bulletRef));
  }

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
      headers: { default: header },
      footers: { default: footer },
      children: bodyChildren,
    });
  }

  // 4. Back matter
  const backChildren: Paragraph[] = [];

  if (sections["CONCLUSION"]) {
    backChildren.push(...buildFrontMatterSection("Conclusion", sections["CONCLUSION"], bulletRef));
  }
  if (sections["PRAYER"]) {
    backChildren.push(...buildFrontMatterSection("Prayer", sections["PRAYER"], bulletRef));
  }
  if (sections["ABOUT THE AUTHOR"]) {
    backChildren.push(...buildFrontMatterSection("About the Author", sections["ABOUT THE AUTHOR"], bulletRef));
  }
  if (sections["MINISTRY PAGE"]) {
    backChildren.push(...buildFrontMatterSection("Graceway Fountain Ministries", sections["MINISTRY PAGE"], bulletRef));
  }

  if (backChildren.length > 0) {
    docSections.push({
      properties: { ...pageProps, type: SectionType.NEXT_PAGE },
      headers: { default: header },
      footers: { default: footer },
      children: backChildren,
    });
  }

  // ── Build document ──────────────────────────────────────────────────────────
  const doc = new Document({ styles, numbering, sections: docSections });
  return Packer.toBuffer(doc);
}
