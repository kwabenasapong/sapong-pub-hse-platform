import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildIntakePrompt(transcripts: string[], book: {
  title: string; translation: string; referenceAuthor: string | null;
  sizeCategory: string; author: { name: string; voiceProfile: unknown; culturalContext: unknown };
}) {
  const voice = book.author.voiceProfile as { tone?: string[]; style?: string } | null;
  const culture = book.author.culturalContext as { background?: string; markers?: string[] } | null;
  return `You are a senior publishing editor converting sermon transcripts into a book chapter by chapter.

AUTHOR: ${book.author.name}
BOOK TITLE: ${book.title}
BIBLE TRANSLATION: ${book.translation}
REFERENCE STYLE: ${book.referenceAuthor ?? "N/A"}
SIZE CATEGORY: ${book.sizeCategory}
VOICE PROFILE: ${voice?.tone?.join(", ") ?? ""} — ${voice?.style ?? ""}
CULTURAL CONTEXT: ${culture?.background ?? ""} | Markers: ${culture?.markers?.join(", ") ?? ""}

TRANSCRIPTS:
${transcripts.map((t, i) => `--- TRANSCRIPT ${i + 1} ---\n${t}`).join("\n\n")}

Produce a detailed Analysis Report with these sections:
1. CENTRAL THEME — The book's core message in 2–3 sentences
2. TITLE CONFIRMATION — Confirm or suggest a better title with reasoning
3. KEY ILLUSTRATIONS — List the strongest personal stories found (with transcript source)
4. CONTENT GAPS — Any doctrine or theme that needs strengthening
5. CHAPTER MAPPING — Which transcript maps to which chapter and why
6. STYLE & TRANSLATION CONFIRMATION — Confirm reference author fit and translation appropriateness

Be specific. Reference actual content from the transcripts.`;
}

function buildOutlinePrompt(transcripts: string[], analysisOutput: string, book: {
  title: string; translation: string; referenceAuthor: string | null; sizeCategory: string;
  author: { name: string; voiceProfile: unknown };
}) {
  const voice = book.author.voiceProfile as { tone?: string[]; style?: string } | null;
  const chapterCount = book.sizeCategory === "FULL" ? "9–10" :
    book.sizeCategory === "MEDIUM_FULL" ? "7–8" :
    book.sizeCategory === "MEDIUM" ? "5–6" : "2–4";
  return `You are building the chapter outline for "${book.title}" by ${book.author.name}.

ANALYSIS REPORT (previously approved):
${analysisOutput}

VOICE: ${voice?.tone?.join(", ") ?? ""} — ${voice?.style ?? ""}
BIBLE TRANSLATION: ${book.translation}

TRANSCRIPTS:
${transcripts.map((t, i) => `--- TRANSCRIPT ${i + 1} ---\n${t}`).join("\n\n")}

Produce a full chapter-by-chapter outline (${chapterCount} chapters) following this structure:
- Chapter 1: Hook — most compelling sermon, sets the book's tone
- Chapters 2–4: Foundation — doctrine, scripture, why this matters
- Chapters 5–8: Development — principles, keys, illustrations
- Chapters 9+: Application — what the reader must do
- Final Chapter: Charge and commissioning — sends the reader out

For EACH chapter provide:
CHAPTER [N]: [TITLE — bold, declarative, never a question]
SOURCE TRANSCRIPT: [which transcript]
CENTRAL THESIS: [one sentence]
KEY SCRIPTURE: [book chapter:verse — ${book.translation}]
MAIN ILLUSTRATION: [personal story from source]
KEY POINTS: [3–5 bullets]
CLOSING PRAYER THEME: [brief]`;
}

function buildChapterPrompt(
  chapterNumber: number,
  outlineSection: string,
  transcriptText: string,
  book: {
    title: string; translation: string; referenceAuthor: string | null; sizeCategory: string;
    author: { name: string; voiceProfile: unknown; culturalContext: unknown };
  },
  previousFeedback?: string
) {
  const voice = book.author.voiceProfile as { tone?: string[]; style?: string } | null;
  const culture = book.author.culturalContext as { background?: string; markers?: string[] } | null;
  const wordRange = book.sizeCategory === "FULL" ? "1,800–2,500" :
    book.sizeCategory === "MEDIUM_FULL" ? "1,500–2,200" :
    book.sizeCategory === "MEDIUM" ? "1,200–2,000" : "800–1,500";

  return `You are converting a sermon transcript into Chapter ${chapterNumber} of "${book.title}" by ${book.author.name}.

VOICE PROFILE: ${voice?.tone?.join(", ") ?? ""} — ${voice?.style ?? ""}
CULTURAL CONTEXT: ${culture?.background ?? ""} | ${culture?.markers?.join(", ") ?? ""}
BIBLE TRANSLATION: ${book.translation}
REFERENCE STYLE: ${book.referenceAuthor ?? "N/A"}
TARGET LENGTH: ${wordRange} words

APPROVED OUTLINE FOR THIS CHAPTER:
${outlineSection}

SOURCE TRANSCRIPT:
${transcriptText}
${previousFeedback ? `\nPREVIOUS FEEDBACK TO ADDRESS:\n${previousFeedback}` : ""}

Write the full chapter following this exact structure:
1. CHAPTER TITLE — bold, declarative, never a question
2. OPENING HOOK — max 2 paragraphs, stops the reader cold
3. SCRIPTURE ANCHOR — primary text in ${book.translation}, formatted as a block quote
4. CENTRAL TEACHING — main body, one idea fully developed in the author's voice
5. ILLUSTRATION — 1–2 personal stories directly from the transcript, sharpened for print
6. APPLICATION — what the reader must do, practical and direct
7. KEY TAKEAWAYS — 3–5 bullet points in the author's voice
8. CLOSING PRAYER — 1 activating paragraph, never skipped

RULES:
- Write in ${book.author.name}'s voice — bold, declarative, no hedging
- Strip all oral filler (say amen, crowd responses, false starts)
- Retain all Ghanaian/African cultural references
- Never invent content not in the source transcript
- End word count in format: [WORD COUNT: XXXX]`;
}

function buildFrontBackMatterPrompt(
  allChapters: string,
  book: {
    title: string; translation: string;
    author: { name: string; credentials: string | null; bioText: string | null; voiceProfile: unknown; culturalContext: unknown };
    programme: { ministry: { name: string } };
  }
) {
  return `You are completing the front and back matter for "${book.title}" by ${book.author.name}.

AUTHOR: ${book.author.name}, ${book.author.credentials ?? ""}
MINISTRY: ${book.programme.ministry.name}
BIO: ${book.author.bioText ?? ""}
TRANSLATION: ${book.translation}

APPROVED CHAPTERS SUMMARY:
${allChapters}

Write ALL of the following sections in sequence, with clear section headers:

## FOREWORD
Write a foreword as if from a respected peer minister (leave [NAME] as placeholder for the actual foreword writer). 250–350 words. Speaks to the author's credibility and the book's importance.

## PREFACE
The author's personal story of why this book was written. First person, pastoral, draws from their banking background and ministry journey. 300–400 words.

## INTRODUCTION
The problem this book solves. Sets up the reader's need and the book's promise. 350–500 words.

## CONCLUSION
Final word to the reader. Sends them out with fire. 250–350 words.

## PRAYER
One powerful activating prayer. 150–200 words.

## ABOUT THE AUTHOR
Full biographical paragraph. Use all credentials. Mention ministry, professional background, family. 200–250 words.

## MINISTRY PAGE
Graceway Fountain Ministries
Address: Accra, Ghana
Website: https://gracewayfountain.org
Email: info@gracewayfountain.org
Phone: (+233) 0241654472
Social: Facebook · Instagram · YouTube · TikTok handles as provided.

Write in ${book.author.name}'s voice throughout — bold, pastoral, direct.`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { bookId, stepNumber, chapterNumber, feedback } = await req.json();

  // Load book with all needed relations
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      author: true,
      programme: { include: { ministry: true } },
      transcripts: { orderBy: { orderIndex: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      chapters: { orderBy: { chapterNumber: "asc" } },
    },
  });

  if (!book) return new Response("Book not found", { status: 404 });

  const transcriptTexts = book.transcripts.map((t) => t.rawText);
  const step2Output = book.workflowSteps.find((s) => s.stepNumber === 2)?.outputText ?? "";
  const step3Output = book.workflowSteps.find((s) => s.stepNumber === 3)?.outputText ?? "";

  let prompt = "";

  if (stepNumber === 2) {
    prompt = buildIntakePrompt(transcriptTexts, {
      title: book.title,
      translation: book.translation,
      referenceAuthor: book.referenceAuthor,
      sizeCategory: book.sizeCategory,
      author: book.author,
    });
  } else if (stepNumber === 3) {
    prompt = buildOutlinePrompt(transcriptTexts, step2Output, {
      title: book.title,
      translation: book.translation,
      referenceAuthor: book.referenceAuthor,
      sizeCategory: book.sizeCategory,
      author: book.author,
    });
  } else if (stepNumber === 4 && chapterNumber) {
    const chNum = parseInt(chapterNumber, 10);
    const transcript = book.transcripts[chNum - 1]?.rawText ?? book.transcripts[0]?.rawText ?? "";
    // Extract the relevant outline section
    const outlineLines = step3Output.split("\n");
    const chapterStart = outlineLines.findIndex((l) =>
      l.match(new RegExp(`CHAPTER\\s+${chNum}[:\\s]`, "i"))
    );
    const chapterEnd = outlineLines.findIndex((l, i) =>
      i > chapterStart && l.match(/^CHAPTER\s+\d+[:\s]/i)
    );
    const outlineSection = outlineLines
      .slice(chapterStart, chapterEnd > chapterStart ? chapterEnd : undefined)
      .join("\n");

    const existingChapter = book.chapters.find((c) => c.chapterNumber === chNum);
    prompt = buildChapterPrompt(chNum, outlineSection, transcript, {
      title: book.title,
      translation: book.translation,
      referenceAuthor: book.referenceAuthor,
      sizeCategory: book.sizeCategory,
      author: book.author,
    }, feedback ?? (existingChapter?.approvedText ? undefined : (existingChapter?.draftText ?? undefined)));
  } else if (stepNumber === 5) {
    const chapterSummary = book.chapters
      .map((c) => `Chapter ${c.chapterNumber}: ${c.title ?? ""}\n${(c.approvedText ?? c.draftText ?? "").slice(0, 300)}…`)
      .join("\n\n");
    prompt = buildFrontBackMatterPrompt(chapterSummary, {
      title: book.title,
      translation: book.translation,
      author: {
        ...book.author,
        credentials: book.author.credentials,
        bioText: book.author.bioText,
      },
      programme: book.programme,
    });
  } else {
    return new Response("Invalid step", { status: 400 });
  }

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const claudeStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullText += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        // Save output to DB after streaming completes
        if (stepNumber === 4 && chapterNumber) {
          const chNum = parseInt(chapterNumber, 10);
          const wordCount = fullText.split(/\s+/).filter(Boolean).length;
          const titleMatch = fullText.match(/^#?\s*(.+)/m);
          const title = titleMatch?.[1]?.replace(/^#+\s*/, "").trim() ?? `Chapter ${chNum}`;

          await prisma.chapter.upsert({
            where: { bookId_chapterNumber: { bookId, chapterNumber: chNum } },
            create: { bookId, chapterNumber: chNum, title, draftText: fullText, wordCount, status: "DRAFT" },
            update: { draftText: fullText, wordCount, title },
          });
        } else {
          await prisma.workflowStep.update({
            where: { bookId_stepNumber: { bookId, stepNumber } },
            data: { outputText: fullText, status: "IN_PROGRESS" },
          });
        }

        // Update book status to IN_PROGRESS if not already
        await prisma.book.update({
          where: { id: bookId },
          data: { status: "IN_PROGRESS" },
        });

      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err instanceof Error ? err.message : "Unknown error"}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no" },
  });
}
