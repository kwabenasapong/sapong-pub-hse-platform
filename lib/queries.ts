import { prisma } from "./prisma";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [ministries, programmes, books, inProgress] = await Promise.all([
    prisma.ministry.count(),
    prisma.publishingProgramme.count(),
    prisma.book.count(),
    prisma.book.count({ where: { status: "IN_PROGRESS" } }),
  ]);
  return { ministries, programmes, books, inProgress };
}

export async function getRecentBooks(limit = 8) {
  // Order by most recent workflow step completion, falling back to createdAt
  const books = await prisma.book.findMany({
    take: limit * 3, // over-fetch so we can sort by last activity
    where: { status: { not: "NOT_STARTED" } }, // only books that have been touched
    include: {
      programme: { include: { ministry: true } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by last workflow activity (most recent completedAt across all steps)
  const withActivity = books.map((b) => {
    const lastActivity = b.workflowSteps
      .map((s) => s.completedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? b.createdAt;
    return { ...b, lastActivity };
  });

  return withActivity
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, limit);
}

// ── Ministries ────────────────────────────────────────────────────────────────

export async function getAllMinistries() {
  return prisma.ministry.findMany({
    orderBy: { name: "asc" },
    include: {
      authors: true,
      programmes: {
        include: {
          books: { select: { id: true, status: true } },
        },
      },
    },
  });
}

// ── Ministry Detail ───────────────────────────────────────────────────────────

export async function getMinistryById(id: string) {
  return prisma.ministry.findUnique({
    where: { id },
    include: {
      authors: true,
      programmes: {
        include: {
          books: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ── Programme Detail ──────────────────────────────────────────────────────────

export async function getProgrammeById(id: string) {
  return prisma.publishingProgramme.findUnique({
    where: { id },
    include: {
      ministry: {
        include: {
          // Include all ministry authors so books can be assigned to any of them
          authors: { select: { id: true, name: true, credentials: true } },
        },
      },
      author: true,
      books: {
        orderBy: { number: "asc" },
        include: {
          author: { select: { id: true, name: true } },
          workflowSteps: { orderBy: { stepNumber: "asc" } },
        },
      },
    },
  });
}

// ── Book Detail ───────────────────────────────────────────────────────────────

export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: {
      programme: { include: { ministry: true } },
      author: true,
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      chapters: { orderBy: { chapterNumber: "asc" } },
      transcripts: { orderBy: { orderIndex: "asc" } },
    },
  });
}
