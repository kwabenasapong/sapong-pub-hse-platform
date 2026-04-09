"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, TextareaField, FormActions } from "./FormFields";
import { addAuthor } from "@/lib/actions";

export default function AddAuthorModal({
  ministryId,
  onClose,
}: {
  ministryId: string;
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
        await addAuthor(fd);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Modal title="Add Author" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Full Name" name="name" placeholder="Rev. Dr. Jane Smith" required />
        <Field label="Credentials" name="credentials" placeholder="DTh, MBA, BSc" />
        <Field
          label="Voice Tone"
          name="tone"
          placeholder="Bold and declarative, Pastoral, Direct (comma-separated)"
        />
        <Field
          label="Voice Style"
          name="style"
          placeholder="Short punchy chapters, heavy Scripture, prayer closings"
        />
        <Field
          label="Cultural Background"
          name="culturalBackground"
          placeholder="e.g. Former banker, Ghana"
        />
        <Field
          label="Cultural Markers"
          name="culturalMarkers"
          placeholder="Ghana cedis, Tema branch (comma-separated)"
        />
        <TextareaField label="Bio" name="bioText" placeholder="Brief author biography…" />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
