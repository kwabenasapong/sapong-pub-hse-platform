"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { updateBook } from "@/lib/actions";
import { useReferenceAuthors } from "@/lib/useReferenceAuthors";
import { Translation, SizeCategory } from "@prisma/client";

type Book = {
  id: string; number: number; title: string;
  translation: Translation; referenceAuthor: string | null; sizeCategory: SizeCategory;
};

export default function EditBookModal({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { authors: refAuthors } = useReferenceAuthors();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("id", book.id);
    startTransition(async () => {
      try { await updateBook(fd); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    });
  }

  return (
    <Modal title="Edit Book" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Book Number" name="number" type="number"
          required defaultValue={String(book.number)} />
        <Field label="Title" name="title" required defaultValue={book.title} />
        <SelectField
          label="Translation" name="translation" required
          defaultValue={book.translation}
          options={[
            { value: "KJV",     label: "KJV — King James Version" },
            { value: "PASSION", label: "Passion Translation" },
            { value: "NLT",     label: "NLT — New Living Translation" },
          ]}
        />
        <SelectField
          label="Size Category" name="sizeCategory" required
          defaultValue={book.sizeCategory}
          options={[
            { value: "FULL",        label: "Full (100–150 pages)" },
            { value: "MEDIUM_FULL", label: "Medium-Full (75–120 pages)" },
            { value: "MEDIUM",      label: "Medium (55–90 pages)" },
            { value: "SHORT",       label: "Short (30–65 pages)" },
          ]}
        />
        <div className="mb-3">
          <label className="block text-xs font-medium text-stone-600 mb-1">Reference Author</label>
          <input
            name="referenceAuthor"
            list="ref-authors-edit"
            defaultValue={book.referenceAuthor ?? ""}
            placeholder="e.g. Oyedepo"
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
          />
          <datalist id="ref-authors-edit">
            {refAuthors.map((a) => <option key={a.id} value={a.name} />)}
          </datalist>
        </div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
