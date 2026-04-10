"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button, BookStatusBadge, TranslationBadge, SizeBadge, WorkflowTracker } from "@/components/ui";
import AddBookModal from "@/components/AddBookModal";
import EditBookModal from "@/components/EditBookModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import ProgrammeInstructionsEditor from "@/components/ProgrammeInstructionsEditor";
import { deleteBook } from "@/lib/actions";
import { MasterInstructions } from "@/lib/master-instructions";
import { Translation, SizeCategory, BookStatus, WorkflowStatus } from "@prisma/client";

type WorkflowStep = { stepNumber: number; status: WorkflowStatus };
type Book = {
  id: string; number: number; title: string;
  translation: Translation; referenceAuthor: string | null;
  sizeCategory: SizeCategory; status: BookStatus;
  workflowSteps: WorkflowStep[];
  author: { id: string; name: string } | null;
};
type Programme = {
  id: string; title: string; defaultTranslation: Translation;
  defaultReferenceAuthor: string | null; status: string;
  masterInstructions: unknown;
  ministry: { id: string; name: string; authors: Array<{ id: string; name: string; credentials: string | null }> };
  author: { id: string; name: string };
  books: Book[];
};

const STEP_LABELS = ["Intake", "Analysis", "Outline", "Drafts", "Matter"];

function currentStepLabel(steps: WorkflowStep[]) {
  const active = steps.find((s) => s.status === "IN_PROGRESS");
  if (active) return `Step ${active.stepNumber}: ${STEP_LABELS[active.stepNumber - 1]}`;
  if (steps.every((s) => s.status === "APPROVED")) return "Complete";
  const first = steps.find((s) => s.status === "PENDING");
  if (first) return `Step ${first.stepNumber}: ${STEP_LABELS[first.stepNumber - 1]}`;
  return "—";
}

export default function ProgrammeDetailClient({
  programme,
  ministryId,
}: {
  programme: Programme;
  ministryId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showAddBook,  setShowAddBook]  = useState(false);
  const [editingBook,  setEditingBook]  = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  function refresh() { router.refresh(); }

  const nextNumber = programme.books.length > 0
    ? Math.max(...programme.books.map((b) => b.number)) + 1 : 1;

  const complete    = programme.books.filter((b) => b.status === "COMPLETE").length;
  const inProgress  = programme.books.filter((b) => b.status === "IN_PROGRESS").length;
  const notStarted  = programme.books.filter((b) => b.status === "NOT_STARTED").length;

  function handleDeleteBook(b: Book) {
    setError(null);
    startTransition(async () => {
      try { await deleteBook(b.id); setDeletingBook(null); refresh(); }
      catch (err) { setDeletingBook(null); setError(err instanceof Error ? err.message : "Delete failed"); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${ministryId}`} className="hover:text-stone-600">{programme.ministry.name}</Link>
        <span className="mx-1.5">›</span>
        {programme.title}
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <PageHeader
        title={programme.title}
        subtitle={`${programme.status} · ${programme.defaultTranslation}${programme.defaultReferenceAuthor ? ` · ${programme.defaultReferenceAuthor}` : ""}`}
        action={
          <Button variant="primary" size="sm" onClick={() => setShowAddBook(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Book
          </Button>
        }
      />

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Title</th>
              <th className="hidden lg:table-cell text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Size</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Translation</th>
              <th className="hidden xl:table-cell text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Author</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Workflow</th>
              <th className="hidden lg:table-cell text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Step</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {programme.books.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-stone-400">
                  No books yet.{" "}
                  <button className="text-amber-600 hover:underline" onClick={() => setShowAddBook(true)}>
                    Add the first book.
                  </button>
                </td>
              </tr>
            )}
            {programme.books.map((book) => (
              <tr key={book.id} className="hover:bg-stone-50 transition-colors group">
                <td className="px-4 py-3 text-xs text-stone-400 font-mono">{book.number}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-stone-800 leading-tight group-hover:text-amber-700 transition-colors">
                    {book.title}
                  </p>
                  {book.referenceAuthor && (
                    <p className="text-[11px] text-stone-400 mt-0.5">{book.referenceAuthor}</p>
                  )}
                </td>
                <td className="hidden lg:table-cell px-4 py-3"><SizeBadge size={book.sizeCategory} /></td>
                <td className="px-4 py-3"><TranslationBadge translation={book.translation} /></td>
                <td className="hidden xl:table-cell px-4 py-3 text-xs text-stone-500">
                  {book.author?.name ?? programme.author.name}
                </td>
                <td className="px-4 py-3"><BookStatusBadge status={book.status} /></td>
                <td className="hidden md:table-cell px-4 py-3"><WorkflowTracker steps={book.workflowSteps} /></td>
                <td className="hidden lg:table-cell px-4 py-3 text-xs text-stone-500">{currentStepLabel(book.workflowSteps)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/books/${book.id}`}
                      className="text-xs text-amber-700 hover:text-amber-600 font-medium">Open</Link>
                    <span className="text-stone-200">·</span>
                    <button onClick={() => setEditingBook(book)}
                      className="text-xs text-stone-500 hover:text-stone-800 transition-colors">Edit</button>
                    <span className="text-stone-200">·</span>
                    <button
                      onClick={() => setDeletingBook(book)}
                      disabled={book.status === "IN_PROGRESS"}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={book.status === "IN_PROGRESS" ? "Cannot delete a book in progress" : ""}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        </div>
        <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-stone-400">
          <span>{programme.books.length} books total</span>
          <span className="text-green-600">{complete} complete</span>
          <span className="text-blue-600">{inProgress} in progress</span>
          <span>{notStarted} not started</span>
        </div>
      </div>

      {/* Programme Instructions */}
      <ProgrammeInstructionsEditor
        programmeId={programme.id}
        initial={programme.masterInstructions as MasterInstructions | null}
        onSaved={() => router.refresh()}
      />

      {showAddBook && (
        <AddBookModal
          programmeId={programme.id}
          authorId={programme.author.id}
          ministryId={ministryId}
          nextBookNumber={nextNumber}
          authors={programme.ministry.authors}
          onClose={() => { setShowAddBook(false); refresh(); }}
        />
      )}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          onClose={() => { setEditingBook(null); refresh(); }}
        />
      )}
      {deletingBook && (
        <ConfirmDeleteDialog
          title={`Delete "${deletingBook.title}"?`}
          message={
            deletingBook.status === "COMPLETE"
              ? "This book is marked complete. Deleting it will permanently remove all chapters, transcripts, and workflow history."
              : "This will permanently delete the book and all its data."
          }
          confirmLabel="Delete Book"
          onConfirm={() => handleDeleteBook(deletingBook)}
          onCancel={() => setDeletingBook(null)}
        />
      )}
    </div>
  );
}
