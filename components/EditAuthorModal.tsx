"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, TextareaField, FormActions } from "./FormFields";
import { updateAuthor } from "@/lib/actions";

type Author = {
  id: string; name: string; credentials: string | null; bioText: string | null;
  voiceProfile: unknown; culturalContext: unknown;
};

export default function EditAuthorModal({
  author,
  onClose,
}: {
  author: Author;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const voice   = author.voiceProfile   as { tone?: string[]; style?: string }  | null;
  const culture = author.culturalContext as { background?: string; markers?: string[] } | null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("id", author.id);
    startTransition(async () => {
      try { await updateAuthor(fd); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    });
  }

  return (
    <Modal title="Edit Author" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Full Name" name="name" required defaultValue={author.name} />
        <Field label="Credentials" name="credentials" defaultValue={author.credentials ?? ""} />
        <Field label="Voice Tone" name="tone" defaultValue={voice?.tone?.join(", ") ?? ""}
          placeholder="Bold and declarative, Pastoral (comma-separated)" />
        <Field label="Voice Style" name="style" defaultValue={voice?.style ?? ""}
          placeholder="Short punchy chapters, heavy Scripture" />
        <Field label="Cultural Background" name="culturalBackground" defaultValue={culture?.background ?? ""} />
        <Field label="Cultural Markers" name="culturalMarkers" defaultValue={culture?.markers?.join(", ") ?? ""}
          placeholder="Ghana cedis, Tema branch (comma-separated)" />
        <TextareaField label="Bio" name="bioText" placeholder="Brief biography…" defaultValue={author.bioText ?? ""} />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
