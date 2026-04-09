"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, FormActions } from "./FormFields";
import { updateMinistry } from "@/lib/actions";

type Ministry = { id: string; name: string; slug: string; logoUrl?: string | null };

export default function EditMinistryModal({
  ministry,
  onClose,
}: {
  ministry: Ministry;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("id", ministry.id);
    startTransition(async () => {
      try { await updateMinistry(fd); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    });
  }

  return (
    <Modal title="Edit Ministry" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Ministry Name" name="name" required defaultValue={ministry.name} />
        <Field label="Slug" name="slug" defaultValue={ministry.slug} />
        <Field label="Logo URL" name="logoUrl" defaultValue={ministry.logoUrl ?? ""} />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
