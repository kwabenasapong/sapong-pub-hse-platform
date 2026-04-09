-- CreateEnum
CREATE TYPE "Translation" AS ENUM ('KJV', 'PASSION', 'NLT');

-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('ACTIVE', 'COMPLETE', 'PAUSED');

-- CreateEnum
CREATE TYPE "SizeCategory" AS ENUM ('FULL', 'MEDIUM_FULL', 'MEDIUM', 'SHORT');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CHAPTER', 'FULL_BOOK');

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" TEXT,
    "voiceProfile" JSONB,
    "culturalContext" JSONB,
    "bioText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingProgramme" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "defaultTranslation" "Translation" NOT NULL,
    "defaultReferenceAuthor" TEXT,
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishingProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "translation" "Translation" NOT NULL,
    "referenceAuthor" TEXT,
    "sizeCategory" "SizeCategory" NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "targetWordCountMin" INTEGER,
    "targetWordCountMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "outputText" TEXT,
    "feedback" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT,
    "status" "ChapterStatus" NOT NULL DEFAULT 'DRAFT',
    "wordCount" INTEGER,
    "draftText" TEXT,
    "approvedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "type" "DocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_slug_key" ON "Ministry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Book_programmeId_number_key" ON "Book"("programmeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_bookId_stepNumber_key" ON "WorkflowStep"("bookId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_bookId_chapterNumber_key" ON "Chapter"("bookId", "chapterNumber");

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingProgramme" ADD CONSTRAINT "PublishingProgramme_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingProgramme" ADD CONSTRAINT "PublishingProgramme_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "PublishingProgramme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
