import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period     = searchParams.get("period") ?? "all";     // week | month | year | all
    const ministryId = searchParams.get("ministryId") ?? undefined;
    const stepType   = searchParams.get("stepType") ?? undefined;

    // Date filter
    const now = new Date();
    let after: Date | undefined;
    if (period === "week")  { after = new Date(now.getTime() - 7  * 86400000); }
    if (period === "month") { after = new Date(now.getFullYear(), now.getMonth(), 1); }
    if (period === "year")  { after = new Date(now.getFullYear(), 0, 1); }

    const where = {
      ...(after       ? { createdAt: { gte: after } }  : {}),
      ...(ministryId  ? { ministryId }                  : {}),
      ...(stepType    ? { stepType }                    : {}),
    };

    const logs = await prisma.aiUsageLog.findMany({
      where,
      include: {
        ministry: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build aggregated structure
    // ministry → author → book → step breakdown
    const byMinistry: Record<string, {
      ministryId: string; ministryName: string;
      inputTokens: number; outputTokens: number; costUsd: number;
      byAuthor: Record<string, {
        authorId: string;
        inputTokens: number; outputTokens: number; costUsd: number;
        byBook: Record<string, {
          bookId: string;
          inputTokens: number; outputTokens: number; costUsd: number;
          byStep: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }>;
        }>;
      }>;
    }> = {};

    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    let totalCostUsd      = 0;

    for (const log of logs) {
      const cost = Number(log.costUsd);
      totalInputTokens  += log.inputTokens;
      totalOutputTokens += log.outputTokens;
      totalCostUsd      += cost;

      const mId = log.ministryId;
      if (!byMinistry[mId]) {
        byMinistry[mId] = {
          ministryId: mId,
          ministryName: log.ministry.name,
          inputTokens: 0, outputTokens: 0, costUsd: 0,
          byAuthor: {},
        };
      }
      const m = byMinistry[mId];
      m.inputTokens  += log.inputTokens;
      m.outputTokens += log.outputTokens;
      m.costUsd      += cost;

      const aId = log.authorId ?? "__unknown__";
      if (!m.byAuthor[aId]) {
        m.byAuthor[aId] = { authorId: aId, inputTokens: 0, outputTokens: 0, costUsd: 0, byBook: {} };
      }
      const a = m.byAuthor[aId];
      a.inputTokens  += log.inputTokens;
      a.outputTokens += log.outputTokens;
      a.costUsd      += cost;

      const bId = log.bookId ?? "__none__";
      if (!a.byBook[bId]) {
        a.byBook[bId] = { bookId: bId, inputTokens: 0, outputTokens: 0, costUsd: 0, byStep: {} };
      }
      const b = a.byBook[bId];
      b.inputTokens  += log.inputTokens;
      b.outputTokens += log.outputTokens;
      b.costUsd      += cost;

      const st = log.stepType;
      if (!b.byStep[st]) {
        b.byStep[st] = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
      }
      b.byStep[st].inputTokens  += log.inputTokens;
      b.byStep[st].outputTokens += log.outputTokens;
      b.byStep[st].costUsd      += cost;
    }

    // Enrich with author/book names
    const authorIds = Array.from(new Set(logs.map((l) => l.authorId).filter(Boolean))) as string[];
    const bookIds   = Array.from(new Set(logs.map((l) => l.bookId).filter(Boolean))) as string[];

    const authors = authorIds.length > 0
      ? await prisma.author.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
      : [];
    const books = bookIds.length > 0
      ? await prisma.book.findMany({ where: { id: { in: bookIds } }, select: { id: true, number: true, title: true } })
      : [];

    const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));
    const bookMap   = Object.fromEntries(books.map((b) => [b.id, `Book ${b.number} — ${b.title}`]));

    return NextResponse.json({
      summary: { totalInputTokens, totalOutputTokens, totalCostUsd, logCount: logs.length },
      byMinistry: Object.values(byMinistry).map((m) => ({
        ...m,
        byAuthor: Object.values(m.byAuthor).map((a) => ({
          ...a,
          authorName: authorMap[a.authorId] ?? "Unknown",
          byBook: Object.values(a.byBook).map((b) => ({
            ...b,
            bookTitle: bookMap[b.bookId] ?? (b.bookId === "__none__" ? "Voice deduction" : b.bookId),
          })),
        })),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// ── Purge logs older than retention period ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { months } = await req.json();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (parseInt(months) || 12));
    const { count } = await prisma.aiUsageLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return NextResponse.json({ ok: true, deleted: count });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
