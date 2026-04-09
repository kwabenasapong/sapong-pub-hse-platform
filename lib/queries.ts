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
  return prisma.book.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      programme: { include: { ministry: true } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
    },
  });
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
      ministry: true,
      author: true,
      books: {
        orderBy: { number: "asc" },
        include: {
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
