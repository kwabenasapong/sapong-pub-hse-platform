"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { updateBook } from "@/lib/actions";
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
        <Field label="Reference Author" name="referenceAuthor"
          defaultValue={book.referenceAuthor ?? ""} />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
