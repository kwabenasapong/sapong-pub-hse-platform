import { MASTER_INSTRUCTIONS, buildClientInstructions, MasterInstructions } from "./master-instructions";

// ── Shared types ──────────────────────────────────────────────────────────────

export type VoiceProfile = {
  tone?:             string[];
  style?:            string;
  keyThemes?:        string[];
  illustrationStyle?: string;
};

export type CulturalContext = {
  background?:  string;
  nationality?: string;
  markers?:     string[];
  ministry?:    string;
};

export type BookContext = {
  id:              string;
  title:           string;
  translation:     string;
  referenceAuthor: string | null;
  sizeCategory:    string;
  number:          number;
  author: {
    name:           string;
    credentials:    string | null;
    bioText:        string | null;
    voiceProfile:   unknown;
    culturalContext: unknown;
  };
  programme: {
    defaultTranslation:     string;
    defaultReferenceAuthor: string | null;
    masterInstructions:     unknown;
    ministry: {
      name: string;
    };
  };
};

// ── Word count ranges ─────────────────────────────────────────────────────────
const WORD_RANGES: Record<string, string> = {
  FULL:        "1,800–2,500",
  MEDIUM_FULL: "1,500–2,200",
  MEDIUM:      "1,200–2,000",
  SHORT:       "800–1,500",
};

const CHAPTER_COUNTS: Record<string, string> = {
  FULL:        "9–10",
  MEDIUM_FULL: "7–8",
  MEDIUM:      "5–6",
  SHORT:       "2–4",
};

// ── Extract typed profiles from unknown JSON ──────────────────────────────────
function voice(raw: unknown): VoiceProfile {
  if (!raw || typeof raw !== "object") return {};
  return raw as VoiceProfile;
}

function culture(raw: unknown): CulturalContext {
  if (!raw || typeof raw !== "object") return {};
  return raw as CulturalContext;
}

function masterInstr(raw: unknown): MasterInstructions {
  if (!raw || typeof raw !== "object") return {};
  return raw as MasterInstructions;
}

// ── Author block (shared across all steps) ────────────────────────────────────
function buildAuthorBlock(book: BookContext): string {
  const v  = voice(book.author.voiceProfile);
  const cc = culture(book.author.culturalContext);
  const mi = masterInstr(book.programme.masterInstructions);

  const title = mi.authorTitle ?? "Author";

  const lines = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "AUTHOR PROFILE",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `NAME:         ${book.author.name}`,
    `TITLE:        ${title}`,
  ];

  if (book.author.credentials) {
    lines.push(`CREDENTIALS:  ${book.author.credentials}`);
  }
  if (mi.familyContext) {
    lines.push(`FAMILY:       ${mi.familyContext}`);
  }
  if (mi.professionalContext) {
    lines.push(`BACKGROUND:   ${mi.professionalContext}`);
  }
  if (book.author.bioText) {
    lines.push(`\nBIO:\n${book.author.bioText}`);
  }

  lines.push("\nVOICE PROFILE:");
  if (v.tone?.length)           lines.push(`  Tone:       ${v.tone.join(" · ")}`);
  if (v.style)                  lines.push(`  Style:      ${v.style}`);
  if (v.keyThemes?.length)      lines.push(`  Key themes: ${v.keyThemes.join(", ")}`);
  if (v.illustrationStyle)      lines.push(`  Illustrations: ${v.illustrationStyle}`);

  lines.push("\nCULTURAL CONTEXT:");
  if (cc.nationality)           lines.push(`  Nationality: ${cc.nationality}`);
  if (cc.background)            lines.push(`  Background:  ${cc.background}`);
  if (cc.markers?.length)       lines.push(`  Markers:     ${cc.markers.join(", ")}`);
  if (cc.ministry)              lines.push(`  Ministry:    ${cc.ministry}`);

  return lines.join("\n");
}

// ── Book metadata block ───────────────────────────────────────────────────────
function buildBookBlock(book: BookContext): string {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "BOOK DETAILS",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `TITLE:           ${book.title}`,
    `TRANSLATION:     ${book.translation}`,
    `REFERENCE STYLE: ${book.referenceAuthor ?? book.programme.defaultReferenceAuthor ?? "N/A"}`,
    `SIZE CATEGORY:   ${book.sizeCategory}`,
    `WORD COUNT:      ${WORD_RANGES[book.sizeCategory] ?? "1,500–2,500"} words per chapter`,
  ].join("\n");
}

// ── Context block (step notes + feedback) ─────────────────────────────────────
function buildContextBlock(stepNotes?: string | null, feedback?: string | null): string {
  const parts: string[] = [];
  if (stepNotes?.trim()) {
    parts.push(`ADDITIONAL CONTEXT / EDITOR NOTES:\n${stepNotes}`);
  }
  if (feedback?.trim()) {
    parts.push(`FEEDBACK FROM PREVIOUS VERSION — ADDRESS THIS:\n${feedback}`);
  }
  if (!parts.length) return "";
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "EDITOR CONTEXT",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ...parts,
  ].join("\n");
}

// ── Full prompt assembler ─────────────────────────────────────────────────────
function assemble(...blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 — ANALYSIS REPORT
// ═════════════════════════════════════════════════════════════════════════════
export function buildAnalysisPrompt(
  transcripts: string[],
  book: BookContext,
  stepNotes?: string | null,
  feedback?: string | null
): string {
  const mi = masterInstr(book.programme.masterInstructions);
  const clientBlock = Object.keys(mi).length > 0 ? buildClientInstructions(mi) : "";

  const stepInstruction = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "STEP 2 — ANALYSIS REPORT",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Produce a detailed Analysis Report with these sections:",
    "1. CENTRAL THEME — The book's core message in 2–3 sentences",
    "2. TITLE CONFIRMATION — Confirm or suggest a better title with reasoning",
    "3. KEY ILLUSTRATIONS — List the strongest personal stories found (with transcript source)",
    "4. CONTENT GAPS — Any doctrine or theme that needs strengthening",
    "5. CHAPTER MAPPING — Which transcript maps to which chapter and why",
    "6. STYLE & TRANSLATION CONFIRMATION — Confirm reference author fit and translation appropriateness",
    "",
    "Be specific. Reference actual content from the transcripts.",
    "",
    `TRANSCRIPTS:\n${transcripts.map((t, i) => `--- TRANSCRIPT ${i + 1} ---\n${t}`).join("\n\n")}`,
  ].join("\n");

  return assemble(
    MASTER_INSTRUCTIONS,
    clientBlock,
    buildAuthorBlock(book),
    buildBookBlock(book),
    buildContextBlock(stepNotes, feedback),
    stepInstruction
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3 — CHAPTER OUTLINE
// ═════════════════════════════════════════════════════════════════════════════
export function buildOutlinePrompt(
  transcripts: string[],
  analysisOutput: string,
  book: BookContext,
  stepNotes?: string | null,
  feedback?: string | null
): string {
  const mi = masterInstr(book.programme.masterInstructions);
  const clientBlock = Object.keys(mi).length > 0 ? buildClientInstructions(mi) : "";
  const chapterCount = CHAPTER_COUNTS[book.sizeCategory] ?? "7–10";

  const stepInstruction = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "STEP 3 — CHAPTER OUTLINE",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Produce a full chapter-by-chapter outline (${chapterCount} chapters).`,
    "",
    "APPROVED ANALYSIS REPORT:",
    analysisOutput,
    "",
    `TRANSCRIPTS:\n${transcripts.map((t, i) => `--- TRANSCRIPT ${i + 1} ---\n${t}`).join("\n\n")}`,
    "",
    "For EACH chapter provide:",
    "CHAPTER [N]: [TITLE — bold, declarative, never a question]",
    "SOURCE TRANSCRIPT: [which transcript]",
    "CENTRAL THESIS: [one sentence]",
    `KEY SCRIPTURE: [book chapter:verse — ${book.translation}]`,
    "MAIN ILLUSTRATION: [personal story from source]",
    "KEY POINTS: [3–5 bullets]",
    "CLOSING PRAYER THEME: [brief]",
  ].join("\n");

  return assemble(
    MASTER_INSTRUCTIONS,
    clientBlock,
    buildAuthorBlock(book),
    buildBookBlock(book),
    buildContextBlock(stepNotes, feedback),
    stepInstruction
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4 — CHAPTER DRAFT
// ═════════════════════════════════════════════════════════════════════════════
export function buildChapterPrompt(
  chapterNumber: number,
  outlineSection: string,
  transcriptText: string,
  book: BookContext,
  feedback?: string | null,
  stepNotes?: string | null
): string {
  const mi = masterInstr(book.programme.masterInstructions);
  const clientBlock = Object.keys(mi).length > 0 ? buildClientInstructions(mi) : "";
  const wordRange = WORD_RANGES[book.sizeCategory] ?? "1,500–2,500";

  const stepInstruction = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `STEP 4 — CHAPTER ${chapterNumber} DRAFT`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Target length: ${wordRange} words`,
    "",
    "APPROVED OUTLINE FOR THIS CHAPTER:",
    outlineSection,
    "",
    "SOURCE TRANSCRIPT:",
    transcriptText,
    "",
    "Write the full chapter following the STANDARD CHAPTER STRUCTURE above.",
    `All scripture in ${book.translation}. End with [WORD COUNT: XXXX].`,
  ].join("\n");

  return assemble(
    MASTER_INSTRUCTIONS,
    clientBlock,
    buildAuthorBlock(book),
    buildBookBlock(book),
    buildContextBlock(stepNotes, feedback),
    stepInstruction
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 5 — FRONT & BACK MATTER
// ═════════════════════════════════════════════════════════════════════════════
export function buildFrontBackMatterPrompt(
  chapterSummary: string,
  book: BookContext,
  stepNotes?: string | null,
  feedback?: string | null
): string {
  const mi = masterInstr(book.programme.masterInstructions);
  const clientBlock = Object.keys(mi).length > 0 ? buildClientInstructions(mi) : "";
  const mc = mi.ministryContacts ?? {};

  const ministryPageContent = [
    mc.address   ? `Address:   ${mc.address}`   : null,
    mc.website   ? `Website:   ${mc.website}`   : null,
    mc.email     ? `Email:     ${mc.email}`     : null,
    mc.phone     ? `Phone:     ${mc.phone}`     : null,
    mc.facebook  ? `Facebook:  ${mc.facebook}`  : null,
    mc.instagram ? `Instagram: ${mc.instagram}` : null,
    mc.youtube   ? `YouTube:   ${mc.youtube}`   : null,
    mc.tiktok    ? `TikTok:    ${mc.tiktok}`    : null,
  ].filter(Boolean).join("\n") || "Contact details to be provided.";

  const stepInstruction = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "STEP 5 — FRONT & BACK MATTER",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Write ALL sections in sequence with clear section headers.",
    "",
    "APPROVED CHAPTERS SUMMARY:",
    chapterSummary,
    "",
    "## FOREWORD",
    "From a respected peer minister. Leave [NAME] as placeholder. 250–350 words.",
    "Speaks to the author's credibility and the book's importance.",
    "",
    "## PREFACE",
    "Author's personal story of why this book was written. First person, pastoral.",
    "Draws from banking career and ministry journey. 300–400 words.",
    "",
    "## INTRODUCTION",
    "The problem this book solves. Sets up the reader's need and promise. 350–500 words.",
    "",
    "## CONCLUSION",
    "Final word to the reader. Sends them out with fire. 250–350 words.",
    "",
    "## PRAYER",
    "One powerful activating prayer. 150–200 words.",
    "",
    "## ABOUT THE AUTHOR",
    "Full biographical paragraph. Use all credentials. Mention ministry, professional",
    "background, family. 200–250 words.",
    "",
    "## MINISTRY PAGE",
    `${book.programme.ministry.name}`,
    ministryPageContent,
  ].join("\n");

  return assemble(
    MASTER_INSTRUCTIONS,
    clientBlock,
    buildAuthorBlock(book),
    buildBookBlock(book),
    buildContextBlock(stepNotes, feedback),
    stepInstruction
  );
}
