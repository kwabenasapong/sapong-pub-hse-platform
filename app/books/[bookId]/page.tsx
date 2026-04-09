import Link from "next/link";
import { BookStatusBadge, TranslationBadge, SizeBadge } from "@/components/ui";
import { BookStatus, Translation, SizeCategory, WorkflowStatus } from "@prisma/client";

const BOOK = {
  id: "book-17",
  number: 17,
  title: "THE X FACTOR — 21 Days to Uncovering What God Hid Inside You",
  translation: "PASSION" as Translation,
  referenceAuthor: "Adeyemi + Munroe",
  sizeCategory: "FULL" as SizeCategory,
  status: "IN_PROGRESS" as BookStatus,
  ministry: "Graceway Fountain Ministries",
  ministryId: "graceway-fountain",
  programmeId: "graceway-40-book",
  programme: "Graceway 40-Book Publishing Programme",
};

const STEPS: Array<{ stepNumber: number; name: string; status: WorkflowStatus }> = [
  { stepNumber: 1, name: "Intake",             status: "APPROVED"    },
  { stepNumber: 2, name: "Analysis Report",    status: "APPROVED"    },
  { stepNumber: 3, name: "Chapter Outline",    status: "APPROVED"    },
  { stepNumber: 4, name: "Chapter Drafts",     status: "IN_PROGRESS" },
  { stepNumber: 5, name: "Front & Back Matter",status: "PENDING"     },
];

const STATUS_ICON: Record<WorkflowStatus, string> = {
  APPROVED: "✓", IN_PROGRESS: "●", PENDING: "○",
};
const STATUS_COLOR: Record<WorkflowStatus, string> = {
  APPROVED: "text-green-600", IN_PROGRESS: "text-amber-600", PENDING: "text-stone-300",
};

export default function BookDetailPage({ params }: { params: { bookId: string } }) {
  void params;
  return (
    <div className="p-8 max-w-4xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${BOOK.ministryId}`} className="hover:text-stone-600">{BOOK.ministry}</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${BOOK.ministryId}/programmes/${BOOK.programmeId}`} className="hover:text-stone-600">{BOOK.programme}</Link>
        <span className="mx-1.5">›</span>
        Book {BOOK.number}
      </p>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-stone-400">Book {BOOK.number}</span>
          <BookStatusBadge status={BOOK.status} />
          <TranslationBadge translation={BOOK.translation} />
          <SizeBadge size={BOOK.sizeCategory} />
        </div>
        <h1 className="text-2xl font-semibold text-stone-800 leading-tight">{BOOK.title}</h1>
        <p className="text-sm text-stone-500 mt-1">Reference: {BOOK.referenceAuthor}</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Workflow Progress</h2>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div
              key={step.stepNumber}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                step.status === "IN_PROGRESS" ? "border-amber-200 bg-amber-50"
                : step.status === "APPROVED"   ? "border-stone-100 bg-stone-50"
                :                                "border-stone-100"
              }`}
            >
              <span className={`text-base w-5 text-center ${STATUS_COLOR[step.status]}`}>
                {STATUS_ICON[step.status]}
              </span>
              <p className={`text-sm font-medium flex-1 ${step.status === "PENDING" ? "text-stone-400" : "text-stone-700"}`}>
                Step {step.stepNumber}: {step.name}
              </p>
              {step.status === "IN_PROGRESS" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Active</span>
              )}
              {step.status === "APPROVED" && (
                <span className="text-xs text-stone-400">Approved</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-stone-100 border border-stone-200 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-500 font-medium">Full workflow UI coming in Phase 4</p>
        <p className="text-xs text-stone-400 mt-1">Transcript upload, AI step execution, chapter review, and DOCX export will be built here.</p>
      </div>
    </div>
  );
}
