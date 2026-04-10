"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { addBook } from "@/lib/actions";
import { useReferenceAuthors } from "@/lib/useReferenceAuthors";

type AuthorOption = { id: string; name: string; credentials?: string | null };

export default function AddBookModal({
  programmeId,
  authorId,
  ministryId,
  nextBookNumber,
  onClose,
  authors = [],
}: {
  programmeId: string;
  authorId: string;
  ministryId: string;
  nextBookNumber: number;
  onClose: () => void;
  authors?: AuthorOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { authors: refAuthors } = useReferenceAuthors();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("programmeId", programmeId);
    // authorId comes from the form (hidden field or selector)
    if (!fd.get("authorId")) fd.append("authorId", authorId);
    fd.append("ministryId", ministryId);
    startTransition(async () => {
      try {
        const bookId = await addBook(fd);
        onClose();
        router.push(`/books/${bookId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Modal title="Add Book" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field
          label="Book Number"
          name="number"
          type="number"
          defaultValue={String(nextBookNumber)}
          required
        />
        <Field label="Title" name="title" placeholder="e.g. GO — The Believer's Mandate" required />
        <SelectField
          label="Translation"
          name="translation"
          required
          defaultValue="KJV"
          options={[
            { value: "KJV",     label: "KJV — King James Version" },
            { value: "PASSION", label: "Passion Translation" },
            { value: "NLT",     label: "NLT — New Living Translation" },
          ]}
        />
        <SelectField
          label="Size Category"
          name="sizeCategory"
          required
          defaultValue="FULL"
          options={[
            { value: "FULL",        label: "Full (100–150 pages, 9–10 sermons)" },
            { value: "MEDIUM_FULL", label: "Medium-Full (75–120 pages, 7–8 sermons)" },
            { value: "MEDIUM",      label: "Medium (55–90 pages, 5–6 sermons)" },
            { value: "SHORT",       label: "Short (30–65 pages, 2–4 sermons)" },
          ]}
        />
        <div className="mb-3">
          <label className="block text-xs font-medium text-stone-600 mb-1">Reference Author</label>
          <input
            name="referenceAuthor"
            list="ref-authors-add"
            placeholder="e.g. Oyedepo"
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
          />
          <datalist id="ref-authors-add">
            {refAuthors.map((a) => <option key={a.id} value={a.name} />)}
          </datalist>
        </div>
        {/* Author selector — only shown when multiple authors exist */}
        {authors.length > 1 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Author <span className="text-red-400">*</span>
            </label>
            <select
              name="authorId"
              defaultValue={authorId}
              className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
            >
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.credentials ? ` — ${a.credentials}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Hidden field when only one author */}
        {authors.length <= 1 && (
          <input type="hidden" name="authorId" value={authorId} />
        )}
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
