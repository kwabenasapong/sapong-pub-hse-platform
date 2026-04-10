import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { logAiUsage, stepTypeFromNumber } from "@/lib/pricing";
import {
  buildAnalysisPrompt,
  buildOutlinePrompt,
  buildChapterPrompt,
  buildFrontBackMatterPrompt,
  BookContext,
} from "@/lib/prompt-builder";

// Client instantiated per-request using config (see POST handler)

// ── Prompt builders ───────────────────────────────────────────────────────────


export async function POST(req: NextRequest) {
  let bookId: string, stepNumber: number, chapterNumber: string | undefined, feedback: string | undefined;
  try {
    ({ bookId, stepNumber, chapterNumber, feedback } = await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Load book with all needed relations
  let book;
  try {
    book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      author: true,
      programme: {
        include: { ministry: true },
      },
      transcripts: { orderBy: { orderIndex: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      chapters: { orderBy: { chapterNumber: "asc" } },
    },
  });

  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Database error", { status: 500 });
  }
  if (!book) return new Response("Book not found", { status: 404 });

  // Load config for this request
  const apiKey = await getConfig("anthropicApiKey");
  const model  = await getConfig("anthropicModel");
  const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });

  // Resolve ministry and author for usage logging
  const ministryId = book.programme.ministryId;
  const authorId   = book.authorId;

  const transcriptTexts = book.transcripts.map((t) => t.rawText);
  const step2Output = book.workflowSteps.find((s) => s.stepNumber === 2)?.outputText ?? "";
  const step3Output = book.workflowSteps.find((s) => s.stepNumber === 3)?.outputText ?? "";

  // Gather notes and prior feedback for the current step
  const currentStep = book.workflowSteps.find((s) => s.stepNumber === stepNumber);
  const stepNotes   = currentStep?.notes ?? "";
  const priorFeedback = feedback ?? currentStep?.feedback ?? "";

  // Build typed BookContext for the prompt builder
  const bookCtx: BookContext = {
    id:              book.id,
    title:           book.title,
    translation:     book.translation,
    referenceAuthor: book.referenceAuthor,
    sizeCategory:    book.sizeCategory,
    number:          book.number,
    author:          book.author,
    programme:       book.programme,
  };

  let prompt = "";

  if (stepNumber === 2) {
    prompt = buildAnalysisPrompt(transcriptTexts, bookCtx, stepNotes, priorFeedback);

  } else if (stepNumber === 3) {
    prompt = buildOutlinePrompt(transcriptTexts, step2Output, bookCtx, stepNotes, priorFeedback);

  } else if (stepNumber === 4 && chapterNumber) {
    const chNum = parseInt(chapterNumber, 10);
    const transcript = book.transcripts[chNum - 1]?.rawText ?? book.transcripts[0]?.rawText ?? "";
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

    prompt = buildChapterPrompt(chNum, outlineSection, transcript, bookCtx, priorFeedback, stepNotes);

  } else if (stepNumber === 5) {
    const chapterSummary = book.chapters
      .map((c) => `Chapter ${c.chapterNumber}: ${c.title ?? ""}\n${(c.approvedText ?? c.draftText ?? "").slice(0, 300)}…`)
      .join("\n\n");
    prompt = buildFrontBackMatterPrompt(chapterSummary, bookCtx, stepNotes, priorFeedback);

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
          model: model,
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

        // Capture token usage and log cost
        try {
          const finalMsg = await claudeStream.finalMessage();
          const { input_tokens, output_tokens } = finalMsg.usage;
          await logAiUsage({
            ministryId,
            authorId,
            bookId,
            stepType: stepTypeFromNumber(stepNumber),
            model,
            inputTokens:  input_tokens,
            outputTokens: output_tokens,
          });
        } catch { /* logging must never break the workflow */ }

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
