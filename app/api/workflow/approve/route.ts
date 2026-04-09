import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { bookId, stepNumber, chapterNumber, feedback, action } = await req.json();
  // action: "approve" | "request_changes" | "approve_chapter"

  if (action === "approve_chapter" && chapterNumber) {
    const chapter = await prisma.chapter.findUnique({
      where: { bookId_chapterNumber: { bookId, chapterNumber } },
    });
    if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { status: "APPROVED", approvedText: chapter.draftText },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    await prisma.workflowStep.update({
      where: { bookId_stepNumber: { bookId, stepNumber } },
      data: { status: "APPROVED", completedAt: new Date(), feedback: null },
    });

    // If step 5 approved → mark book complete
    if (stepNumber === 5) {
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "COMPLETE" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "request_changes") {
    await prisma.workflowStep.update({
      where: { bookId_stepNumber: { bookId, stepNumber } },
      data: { feedback, status: "IN_PROGRESS" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
