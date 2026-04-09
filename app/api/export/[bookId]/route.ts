import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBookDocx } from "@/lib/docx-builder";

export async function GET(
  _req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: params.bookId },
      include: {
        author: true,
        programme: { include: { ministry: true } },
        chapters: { orderBy: { chapterNumber: "asc" } },
        workflowSteps: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const buffer = await buildBookDocx(book);

    // Sanitise title for filename
    const filename = book.title
      .split("\u2014")[0]
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60)
      + `_Book${book.number}.docx`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("DOCX export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
