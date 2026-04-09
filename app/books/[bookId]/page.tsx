import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookById } from "@/lib/queries";
import { BookStatusBadge, TranslationBadge, SizeBadge } from "@/components/ui";
import { WorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_ICON: Record<WorkflowStatus, string> = {
  APPROVED: "✓", IN_PROGRESS: "●", PENDING: "○",
};
const STATUS_COLOR: Record<WorkflowStatus, string> = {
  APPROVED: "text-green-600", IN_PROGRESS: "text-amber-600", PENDING: "text-stone-300",
};

export default async function BookDetailPage({ params }: { params: { bookId: string } }) {
  const book = await getBookById(params.bookId);
  if (!book) notFound();

  const ministryId = book.programme.ministry.id;
  const programmeId = book.programme.id;

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${ministryId}`} className="hover:text-stone-600">
          {book.programme.ministry.name}
        </Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${ministryId}/programmes/${programmeId}`} className="hover:text-stone-600">
          {book.programme.title}
        </Link>
        <span className="mx-1.5">›</span>
        Book {book.number}
      </p>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-stone-400">Book {book.number}</span>
          <BookStatusBadge status={book.status} />
          <TranslationBadge translation={book.translation} />
          <SizeBadge size={book.sizeCategory} />
        </div>
        <h1 className="text-2xl font-semibold text-stone-800 leading-tight">{book.title}</h1>
        {book.referenceAuthor && (
          <p className="text-sm text-stone-500 mt-1">Reference: {book.referenceAuthor}</p>
        )}
        {book.targetWordCountMin && (
          <p className="text-xs text-stone-400 mt-1">
            Target: {book.targetWordCountMin.toLocaleString()}–{book.targetWordCountMax?.toLocaleString()} words
          </p>
        )}
      </div>

      {/* Workflow steps */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
          Workflow Progress
        </h2>
        <div className="space-y-2">
          {book.workflowSteps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                step.status === "IN_PROGRESS" ? "border-amber-200 bg-amber-50"
                : step.status === "APPROVED"   ? "border-stone-100 bg-stone-50"
                :                                "border-stone-100"
              }`}
            >
              <span className={`text-sm w-5 text-center ${STATUS_COLOR[step.status]}`}>
                {STATUS_ICON[step.status]}
              </span>
              <p className={`text-sm font-medium flex-1 ${step.status === "PENDING" ? "text-stone-400" : "text-stone-700"}`}>
                Step {step.stepNumber}: {step.stepName}
              </p>
              {step.completedAt && (
                <span className="text-xs text-stone-400">
                  {new Date(step.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              )}
              {step.status === "IN_PROGRESS" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Active</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chapters (if any) */}
      {book.chapters.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
            Chapters ({book.chapters.length})
          </h2>
          <div className="space-y-1">
            {book.chapters.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-stone-400 w-6">{ch.chapterNumber}</span>
                  <p className="text-sm text-stone-700">{ch.title || `Chapter ${ch.chapterNumber}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ch.wordCount && (
                    <span className="text-xs text-stone-400">{ch.wordCount.toLocaleString()} words</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    ch.status === "APPROVED"
                      ? "bg-green-50 text-green-700"
                      : "bg-stone-100 text-stone-500"
                  }`}>
                    {ch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for Phase 4 */}
      <div className="bg-stone-100 border border-dashed border-stone-300 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-500 font-medium">Full workflow UI — Phase 4</p>
        <p className="text-xs text-stone-400 mt-1">
          Transcript upload · AI step execution · Chapter review · DOCX export
        </p>
      </div>
    </div>
  );
}
