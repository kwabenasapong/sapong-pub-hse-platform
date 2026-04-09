import Link from "next/link";
import { PageHeader, Button, BookStatusBadge, TranslationBadge, SizeBadge, WorkflowTracker } from "@/components/ui";
import { BookStatus, Translation, SizeCategory, WorkflowStatus } from "@prisma/client";

const PROGRAMME = {
  id: "graceway-40-book",
  ministryId: "graceway-fountain",
  ministryName: "Graceway Fountain Ministries",
  title: "Graceway 40-Book Publishing Programme",
  defaultTranslation: "KJV" as Translation,
  referenceAuthor: "Oyedepo · Munroe · Adeyemi · Ashimolowo",
  status: "ACTIVE",
  books: [
    {
      id: "book-1",
      number: 1,
      title: "GO — The Believer's Mandate to Reach the Lost",
      translation: "KJV" as Translation,
      referenceAuthor: "Oyedepo",
      sizeCategory: "FULL" as SizeCategory,
      status: "COMPLETE" as BookStatus,
      steps: Array.from({ length: 5 }, (_, i) => ({ stepNumber: i + 1, status: "APPROVED" as WorkflowStatus })),
    },
    {
      id: "book-17",
      number: 17,
      title: "THE X FACTOR — 21 Days to Uncovering What God Hid Inside You",
      translation: "PASSION" as Translation,
      referenceAuthor: "Adeyemi + Munroe",
      sizeCategory: "FULL" as SizeCategory,
      status: "IN_PROGRESS" as BookStatus,
      steps: [
        { stepNumber: 1, status: "APPROVED" as WorkflowStatus },
        { stepNumber: 2, status: "APPROVED" as WorkflowStatus },
        { stepNumber: 3, status: "APPROVED" as WorkflowStatus },
        { stepNumber: 4, status: "IN_PROGRESS" as WorkflowStatus },
        { stepNumber: 5, status: "PENDING" as WorkflowStatus },
      ],
    },
    {
      id: "book-24",
      number: 24,
      title: "THE EXCHANGE — What the Cross Cost and What It Bought for You",
      translation: "NLT" as Translation,
      referenceAuthor: "Ashimolowo",
      sizeCategory: "FULL" as SizeCategory,
      status: "IN_PROGRESS" as BookStatus,
      steps: [
        { stepNumber: 1, status: "APPROVED" as WorkflowStatus },
        { stepNumber: 2, status: "IN_PROGRESS" as WorkflowStatus },
        { stepNumber: 3, status: "PENDING" as WorkflowStatus },
        { stepNumber: 4, status: "PENDING" as WorkflowStatus },
        { stepNumber: 5, status: "PENDING" as WorkflowStatus },
      ],
    },
  ],
};

const STEP_LABELS = ["Intake", "Analysis", "Outline", "Drafts", "Matter"];

function currentStepLabel(steps: { stepNumber: number; status: WorkflowStatus }[]) {
  const active = steps.find((s) => s.status === "IN_PROGRESS");
  if (active) return `Step ${active.stepNumber}: ${STEP_LABELS[active.stepNumber - 1]}`;
  const allApproved = steps.every((s) => s.status === "APPROVED");
  if (allApproved) return "Complete";
  const firstPending = steps.find((s) => s.status === "PENDING");
  if (firstPending) return `Step ${firstPending.stepNumber}: ${STEP_LABELS[firstPending.stepNumber - 1]}`;
  return "—";
}

export default function ProgrammeDetailPage({
  params,
}: {
  params: { id: string; programmeId: string };
}) {
  const prog = PROGRAMME;

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${params.id}`} className="hover:text-stone-600">{prog.ministryName}</Link>
        <span className="mx-1.5">›</span>
        {prog.title}
      </p>

      <PageHeader
        title={prog.title}
        subtitle={`${prog.status} · Default: ${prog.defaultTranslation} · ${prog.referenceAuthor}`}
        action={
          <Button variant="primary" size="sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Book
          </Button>
        }
      />

      {/* Book catalogue */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Size</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Translation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Workflow</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Step</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {prog.books.map((book) => (
              <tr key={book.id} className="hover:bg-stone-50 transition-colors group">
                <td className="px-4 py-3 text-xs text-stone-400 font-mono">{book.number}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-800 leading-tight text-sm group-hover:text-amber-700 transition-colors">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{book.referenceAuthor}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><SizeBadge size={book.sizeCategory} /></td>
                <td className="px-4 py-3"><TranslationBadge translation={book.translation} /></td>
                <td className="px-4 py-3"><BookStatusBadge status={book.status} /></td>
                <td className="px-4 py-3"><WorkflowTracker steps={book.steps} /></td>
                <td className="px-4 py-3 text-xs text-stone-500">{currentStepLabel(book.steps)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/books/${book.id}`}
                    className="text-xs text-amber-700 hover:text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer summary */}
        <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 flex items-center gap-6 text-xs text-stone-400">
          <span>{prog.books.length} books shown</span>
          <span>{prog.books.filter((b) => b.status === "COMPLETE").length} complete</span>
          <span>{prog.books.filter((b) => b.status === "IN_PROGRESS").length} in progress</span>
          <span>{prog.books.filter((b) => b.status === "NOT_STARTED").length} not started</span>
        </div>
      </div>
    </div>
  );
}
