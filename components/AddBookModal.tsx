"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { addBook } from "@/lib/actions";

export default function AddBookModal({
  programmeId,
  authorId,
  ministryId,
  nextBookNumber,
  onClose,
}: {
  programmeId: string;
  authorId: string;
  ministryId: string;
  nextBookNumber: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("programmeId", programmeId);
    fd.append("authorId", authorId);
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
        <Field label="Reference Author" name="referenceAuthor" placeholder="e.g. Oyedepo" />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
