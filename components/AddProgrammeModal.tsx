"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { addProgramme } from "@/lib/actions";

type Author = { id: string; name: string };

export default function AddProgrammeModal({
  ministryId,
  authors,
  onClose,
}: {
  ministryId: string;
  authors: Author[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("ministryId", ministryId);
    startTransition(async () => {
      try {
        await addProgramme(fd);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Modal title="Add Publishing Programme" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Programme Title" name="title" placeholder="e.g. 40-Book Publishing Programme" required />
        <SelectField
          label="Author"
          name="authorId"
          required
          options={authors.map((a) => ({ value: a.id, label: a.name }))}
        />
        <SelectField
          label="Default Translation"
          name="defaultTranslation"
          required
          defaultValue="KJV"
          options={[
            { value: "KJV", label: "KJV — King James Version" },
            { value: "PASSION", label: "Passion Translation" },
            { value: "NLT", label: "NLT — New Living Translation" },
          ]}
        />
        <Field label="Default Reference Author" name="defaultReferenceAuthor" placeholder="e.g. Oyedepo" />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
