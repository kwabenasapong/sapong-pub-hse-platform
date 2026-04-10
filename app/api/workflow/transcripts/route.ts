import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookId, transcripts } = await req.json();
    // transcripts: Array<{ filename: string; rawText: string; orderIndex: number }>

    if (!bookId || !Array.isArray(transcripts) || transcripts.length === 0) {
      return NextResponse.json({ error: "bookId and transcripts required" }, { status: 400 });
    }

    // Delete existing transcripts for this book then re-insert
    await prisma.transcript.deleteMany({ where: { bookId } });

    await prisma.transcript.createMany({
      data: transcripts.map((t) => ({
        bookId,
        filename: t.filename,
        rawText: t.rawText,
        orderIndex: t.orderIndex,
      })),
    });

    // Mark step 1 as approved
    await prisma.workflowStep.update({
      where: { bookId_stepNumber: { bookId, stepNumber: 1 } },
      data: { status: "APPROVED", completedAt: new Date() },
    });

    // Unlock step 2
    await prisma.workflowStep.update({
      where: { bookId_stepNumber: { bookId, stepNumber: 2 } },
      data: { status: "IN_PROGRESS" },
    });

    // Move book to IN_PROGRESS
    await prisma.book.update({
      where: { id: bookId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({ ok: true, count: transcripts.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
