import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookId, stepNumber, chapterNumber, feedback, notes, action } = await req.json();
    // actions: "approve" | "approve_chapter" | "request_changes" | "revert" | "reopen_chapter" | "save_notes"

    // ── Save notes only ────────────────────────────────────────────────────────
    if (action === "save_notes") {
      await prisma.workflowStep.update({
        where: { bookId_stepNumber: { bookId, stepNumber } },
        data: { notes },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Approve a workflow step ────────────────────────────────────────────────
    if (action === "approve") {
      await prisma.workflowStep.update({
        where: { bookId_stepNumber: { bookId, stepNumber } },
        data: { status: "APPROVED", completedAt: new Date() },
      });
      // Unlock the next step
      if (stepNumber < 5) {
        await prisma.workflowStep.update({
          where: { bookId_stepNumber: { bookId, stepNumber: stepNumber + 1 } },
          data: { status: "IN_PROGRESS" },
        });
      }
      if (stepNumber === 5) {
        await prisma.book.update({ where: { id: bookId }, data: { status: "COMPLETE" } });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Approve a chapter ─────────────────────────────────────────────────────
    if (action === "approve_chapter") {
      const ch = await prisma.chapter.findUnique({
        where: { bookId_chapterNumber: { bookId, chapterNumber } },
      });
      if (!ch) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
      await prisma.chapter.update({
        where: { id: ch.id },
        data: { status: "APPROVED", approvedText: ch.draftText },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Re-open a chapter (unapprove without cascade) ─────────────────────────
    if (action === "reopen_chapter") {
      await prisma.chapter.update({
        where: { bookId_chapterNumber: { bookId, chapterNumber } },
        data: { status: "DRAFT", approvedText: null },
      });
      // Also ensure step 4 is back to IN_PROGRESS
      await prisma.workflowStep.update({
        where: { bookId_stepNumber: { bookId, stepNumber: 4 } },
        data: { status: "IN_PROGRESS", completedAt: null },
      });
      await prisma.book.update({ where: { id: bookId }, data: { status: "IN_PROGRESS" } });
      return NextResponse.json({ ok: true });
    }

    // ── Request changes (save feedback, keep IN_PROGRESS) ─────────────────────
    if (action === "request_changes") {
      await prisma.workflowStep.update({
        where: { bookId_stepNumber: { bookId, stepNumber } },
        data: { feedback, status: "IN_PROGRESS" },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Revert a step (with optional cascade) ─────────────────────────────────
    // cascade: resets this step AND all downstream steps + unapproves chapters
    if (action === "revert") {
      const cascade: boolean = req.headers.get("x-cascade") === "true";

      // Revert the target step
      await prisma.workflowStep.update({
        where: { bookId_stepNumber: { bookId, stepNumber } },
        data: { status: "IN_PROGRESS", completedAt: null, outputText: null },
      });

      if (cascade) {
        // Revert all steps after this one
        const stepsToReset = [2, 3, 4, 5].filter((n) => n > stepNumber);
        for (const n of stepsToReset) {
          await prisma.workflowStep.update({
            where: { bookId_stepNumber: { bookId, stepNumber: n } },
            data: { status: "PENDING", completedAt: null, outputText: null, feedback: null },
          });
        }
        // If reverting step 3 or earlier, unapprove all chapters
        if (stepNumber <= 3) {
          await prisma.chapter.updateMany({
            where: { bookId },
            data: { status: "DRAFT", approvedText: null, draftText: null },
          });
        }
        // If reverting step 1, also delete transcripts
        if (stepNumber === 1) {
          await prisma.transcript.deleteMany({ where: { bookId } });
        }
      }

      // Book goes back to IN_PROGRESS (unless step 1 revert with cascade → NOT_STARTED)
      const newBookStatus = (stepNumber === 1 && cascade) ? "NOT_STARTED" : "IN_PROGRESS";
      await prisma.book.update({ where: { id: bookId }, data: { status: newBookStatus } });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
