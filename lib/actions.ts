"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { Translation, SizeCategory, ProgrammeStatus } from "@prisma/client";

// ── Add Ministry ──────────────────────────────────────────────────────────────

export async function addMinistry(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const logoUrl = (formData.get("logoUrl") as string) || null;

  if (!name?.trim()) throw new Error("Ministry name is required");

  await prisma.ministry.create({
    data: { name: name.trim(), slug, logoUrl },
  });

  revalidatePath("/ministries");
  revalidatePath("/");
}

// ── Add Author ────────────────────────────────────────────────────────────────

export async function addAuthor(formData: FormData) {
  const ministryId = formData.get("ministryId") as string;
  const name = formData.get("name") as string;
  const credentials = (formData.get("credentials") as string) || null;
  const bioText = (formData.get("bioText") as string) || null;
  const toneRaw = formData.get("tone") as string;
  const styleRaw = formData.get("style") as string;
  const culturalBackground = formData.get("culturalBackground") as string;
  const culturalMarkersRaw = formData.get("culturalMarkers") as string;

  if (!ministryId || !name?.trim()) throw new Error("Ministry and author name are required");

  const voiceProfile = {
    tone: toneRaw ? toneRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    style: styleRaw || "",
  };
  const culturalContext = {
    background: culturalBackground || "",
    markers: culturalMarkersRaw ? culturalMarkersRaw.split(",").map((m) => m.trim()).filter(Boolean) : [],
  };

  await prisma.author.create({
    data: { ministryId, name: name.trim(), credentials, bioText, voiceProfile, culturalContext },
  });

  revalidatePath(`/ministries/${ministryId}`);
}

// ── Add Programme ─────────────────────────────────────────────────────────────

export async function addProgramme(formData: FormData) {
  const ministryId = formData.get("ministryId") as string;
  const authorId = formData.get("authorId") as string;
  const title = formData.get("title") as string;
  const defaultTranslation = formData.get("defaultTranslation") as Translation;
  const defaultReferenceAuthor = (formData.get("defaultReferenceAuthor") as string) || null;

  if (!ministryId || !authorId || !title?.trim()) throw new Error("Ministry, author, and title are required");

  await prisma.publishingProgramme.create({
    data: {
      ministryId,
      authorId,
      title: title.trim(),
      defaultTranslation,
      defaultReferenceAuthor,
      status: ProgrammeStatus.ACTIVE,
    },
  });

  revalidatePath(`/ministries/${ministryId}`);
  revalidatePath("/");
}

// ── Add Book ──────────────────────────────────────────────────────────────────

export async function addBook(formData: FormData) {
  const programmeId = formData.get("programmeId") as string;
  const authorId = formData.get("authorId") as string;
  const ministryId = formData.get("ministryId") as string;
  const number = parseInt(formData.get("number") as string, 10);
  const title = formData.get("title") as string;
  const translation = formData.get("translation") as Translation;
  const referenceAuthor = (formData.get("referenceAuthor") as string) || null;
  const sizeCategory = formData.get("sizeCategory") as SizeCategory;

  const wordCountMap: Record<SizeCategory, [number, number]> = {
    FULL: [18000, 25000],
    MEDIUM_FULL: [12000, 18000],
    MEDIUM: [8000, 12000],
    SHORT: [3000, 8000],
  };
  const [min, max] = wordCountMap[sizeCategory] ?? [8000, 18000];

  if (!programmeId || !title?.trim() || isNaN(number)) throw new Error("Programme, number, and title are required");

  const book = await prisma.book.create({
    data: {
      programmeId,
      authorId,
      number,
      title: title.trim(),
      translation,
      referenceAuthor,
      sizeCategory,
      status: "NOT_STARTED",
      targetWordCountMin: min,
      targetWordCountMax: max,
    },
  });

  // Auto-create the 5 workflow steps
  await prisma.workflowStep.createMany({
    data: [
      { bookId: book.id, stepNumber: 1, stepName: "Intake",              status: "PENDING" },
      { bookId: book.id, stepNumber: 2, stepName: "Analysis Report",     status: "PENDING" },
      { bookId: book.id, stepNumber: 3, stepName: "Chapter Outline",     status: "PENDING" },
      { bookId: book.id, stepNumber: 4, stepName: "Chapter Drafts",      status: "PENDING" },
      { bookId: book.id, stepNumber: 5, stepName: "Front & Back Matter", status: "PENDING" },
    ],
  });

  revalidatePath(`/ministries/${ministryId}/programmes/${programmeId}`);
  revalidatePath("/");
  return book.id;
}

// ── Update Ministry ───────────────────────────────────────────────────────────
export async function updateMinistry(formData: FormData) {
  const id      = formData.get("id") as string;
  const name    = formData.get("name") as string;
  const slug    = (formData.get("slug") as string) || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const logoUrl = (formData.get("logoUrl") as string) || null;

  if (!id || !name?.trim()) throw new Error("ID and name required");

  await prisma.ministry.update({ where: { id }, data: { name: name.trim(), slug, logoUrl } });
  revalidatePath("/ministries");
  revalidatePath(`/ministries/${id}`);
  revalidatePath("/");
}

// ── Delete Ministry ───────────────────────────────────────────────────────────
export async function deleteMinistry(id: string) {
  // Guard: no programmes with books in progress
  const programmes = await prisma.publishingProgramme.findMany({
    where: { ministryId: id },
    include: { books: { select: { status: true } } },
  });
  const hasActive = programmes.some((p) =>
    p.books.some((b) => b.status === "IN_PROGRESS" || b.status === "COMPLETE")
  );
  if (hasActive) throw new Error("Cannot delete a ministry that has active or completed books.");

  await prisma.ministry.delete({ where: { id } });
  revalidatePath("/ministries");
  revalidatePath("/");
}

// ── Update Author ─────────────────────────────────────────────────────────────
export async function updateAuthor(formData: FormData) {
  const id          = formData.get("id") as string;
  const name        = formData.get("name") as string;
  const credentials = (formData.get("credentials") as string) || null;
  const bioText     = (formData.get("bioText") as string) || null;
  const toneRaw     = formData.get("tone") as string;
  const styleRaw    = formData.get("style") as string;
  const culturalBackground = formData.get("culturalBackground") as string;
  const culturalMarkersRaw = formData.get("culturalMarkers") as string;

  if (!id || !name?.trim()) throw new Error("ID and name required");

  const voiceProfile   = { tone: toneRaw ? toneRaw.split(",").map((t) => t.trim()).filter(Boolean) : [], style: styleRaw || "" };
  const culturalContext = { background: culturalBackground || "", markers: culturalMarkersRaw ? culturalMarkersRaw.split(",").map((m) => m.trim()).filter(Boolean) : [] };

  const author = await prisma.author.update({ where: { id }, data: { name: name.trim(), credentials, bioText, voiceProfile, culturalContext } });
  revalidatePath(`/ministries/${author.ministryId}`);
}

// ── Delete Author ─────────────────────────────────────────────────────────────
export async function deleteAuthor(id: string) {
  const author = await prisma.author.findUnique({ where: { id }, include: { books: { select: { status: true } } } });
  if (!author) throw new Error("Author not found");
  const hasActive = author.books.some((b) => b.status === "IN_PROGRESS" || b.status === "COMPLETE");
  if (hasActive) throw new Error("Cannot delete an author with active or completed books.");

  await prisma.author.delete({ where: { id } });
  revalidatePath(`/ministries/${author.ministryId}`);
}

// ── Update Programme ──────────────────────────────────────────────────────────
export async function updateProgramme(formData: FormData) {
  const id                    = formData.get("id") as string;
  const title                 = formData.get("title") as string;
  const defaultTranslation    = formData.get("defaultTranslation") as Translation;
  const defaultReferenceAuthor = (formData.get("defaultReferenceAuthor") as string) || null;
  const status                = formData.get("status") as ProgrammeStatus;

  if (!id || !title?.trim()) throw new Error("ID and title required");

  const prog = await prisma.publishingProgramme.update({
    where: { id },
    data: { title: title.trim(), defaultTranslation, defaultReferenceAuthor, status },
  });
  revalidatePath(`/ministries/${prog.ministryId}`);
  revalidatePath(`/ministries/${prog.ministryId}/programmes/${id}`);
  revalidatePath("/");
}

// ── Delete Programme ──────────────────────────────────────────────────────────
export async function deleteProgramme(id: string) {
  const prog = await prisma.publishingProgramme.findUnique({
    where: { id },
    include: { books: { select: { status: true } } },
  });
  if (!prog) throw new Error("Programme not found");
  const hasActive = prog.books.some((b) => b.status === "IN_PROGRESS" || b.status === "COMPLETE");
  if (hasActive) throw new Error("Cannot delete a programme with active or completed books.");

  await prisma.publishingProgramme.delete({ where: { id } });
  revalidatePath(`/ministries/${prog.ministryId}`);
  revalidatePath("/");
}

// ── Update Book ───────────────────────────────────────────────────────────────
export async function updateBook(formData: FormData) {
  const id             = formData.get("id") as string;
  const number         = parseInt(formData.get("number") as string, 10);
  const title          = formData.get("title") as string;
  const translation    = formData.get("translation") as Translation;
  const referenceAuthor = (formData.get("referenceAuthor") as string) || null;
  const sizeCategory   = formData.get("sizeCategory") as SizeCategory;

  if (!id || !title?.trim() || isNaN(number)) throw new Error("ID, number, and title required");

  const wordCountMap: Record<SizeCategory, [number, number]> = {
    FULL: [18000, 25000], MEDIUM_FULL: [12000, 18000], MEDIUM: [8000, 12000], SHORT: [3000, 8000],
  };
  const [min, max] = wordCountMap[sizeCategory] ?? [8000, 18000];

  const book = await prisma.book.update({
    where: { id },
    data: { number, title: title.trim(), translation, referenceAuthor, sizeCategory, targetWordCountMin: min, targetWordCountMax: max },
  });
  revalidatePath(`/ministries/${(await prisma.publishingProgramme.findUnique({ where: { id: book.programmeId }, include: { ministry: true } }))?.ministryId}/programmes/${book.programmeId}`);
  revalidatePath(`/books/${id}`);
}

// ── Delete Book ───────────────────────────────────────────────────────────────
export async function deleteBook(id: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: { programme: { include: { ministry: true } } },
  });
  if (!book) throw new Error("Book not found");
  if (book.status === "IN_PROGRESS") throw new Error("Cannot delete a book that is in progress. Complete or reset it first.");

  await prisma.book.delete({ where: { id } });
  revalidatePath(`/ministries/${book.programme.ministryId}/programmes/${book.programmeId}`);
  revalidatePath("/");
}

// ── Setup Wizard — create ministry + author + programme + books in one shot ───
export async function setupNewClient(data: {
  ministry: { name: string; slug: string; logoUrl?: string };
  author: {
    name: string; credentials?: string; bioText?: string;
    voiceProfile: object; culturalContext: object;
  };
  programme: {
    title: string; defaultTranslation: Translation;
    defaultReferenceAuthor?: string;
  };
  books: Array<{
    number: number; title: string; translation: Translation;
    sizeCategory: SizeCategory; referenceAuthor?: string;
  }>;
}) {
  const wordCountMap: Record<SizeCategory, [number, number]> = {
    FULL: [18000, 25000], MEDIUM_FULL: [12000, 18000],
    MEDIUM: [8000, 12000], SHORT: [3000, 8000],
  };

  // 1. Ministry
  const ministry = await prisma.ministry.create({
    data: {
      name: data.ministry.name.trim(),
      slug: data.ministry.slug,
      logoUrl: data.ministry.logoUrl || null,
    },
  });

  // 2. Author
  const author = await prisma.author.create({
    data: {
      ministryId: ministry.id,
      name: data.author.name.trim(),
      credentials: data.author.credentials || null,
      bioText: data.author.bioText || null,
      voiceProfile: data.author.voiceProfile,
      culturalContext: data.author.culturalContext,
    },
  });

  // 3. Programme
  const programme = await prisma.publishingProgramme.create({
    data: {
      ministryId: ministry.id,
      authorId: author.id,
      title: data.programme.title.trim(),
      defaultTranslation: data.programme.defaultTranslation,
      defaultReferenceAuthor: data.programme.defaultReferenceAuthor || null,
      status: "ACTIVE",
    },
  });

  // 4. Books + workflow steps
  for (const b of data.books) {
    if (!b.title.trim()) continue;
    const [min, max] = wordCountMap[b.sizeCategory] ?? [8000, 18000];
    const book = await prisma.book.create({
      data: {
        programmeId: programme.id,
        authorId: author.id,
        number: b.number,
        title: b.title.trim(),
        translation: b.translation,
        referenceAuthor: b.referenceAuthor || null,
        sizeCategory: b.sizeCategory,
        status: "NOT_STARTED",
        targetWordCountMin: min,
        targetWordCountMax: max,
      },
    });

    await prisma.workflowStep.createMany({
      data: [
        { bookId: book.id, stepNumber: 1, stepName: "Intake",              status: "PENDING" },
        { bookId: book.id, stepNumber: 2, stepName: "Analysis Report",     status: "PENDING" },
        { bookId: book.id, stepNumber: 3, stepName: "Chapter Outline",     status: "PENDING" },
        { bookId: book.id, stepNumber: 4, stepName: "Chapter Drafts",      status: "PENDING" },
        { bookId: book.id, stepNumber: 5, stepName: "Front & Back Matter", status: "PENDING" },
      ],
    });
  }

  revalidatePath("/ministries");
  revalidatePath("/");
  return { ministryId: ministry.id, programmeId: programme.id };
}
