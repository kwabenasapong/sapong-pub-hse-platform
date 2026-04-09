import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ministries = await prisma.ministry.findMany({
    orderBy: { name: "asc" },
    include: {
      authors: { select: { id: true } },
      programmes: {
        include: { books: { select: { id: true, status: true } } },
      },
    },
  });

  const rows = ministries.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    authorCount: m.authors.length,
    programmeCount: m.programmes.length,
    bookCount: m.programmes.reduce((acc, p) => acc + p.books.length, 0),
    completeCount: m.programmes.reduce(
      (acc, p) => acc + p.books.filter((b) => b.status === "COMPLETE").length,
      0
    ),
  }));

  return NextResponse.json(rows);
}
