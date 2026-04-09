"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, FormActions } from "./FormFields";
import { addMinistry } from "@/lib/actions";

export default function AddMinistryModal({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addMinistry(fd);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Modal title="Add Ministry" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Ministry Name" name="name" placeholder="e.g. Graceway Fountain Ministries" required />
        <Field label="Slug" name="slug" placeholder="auto-generated if left blank" />
        <Field label="Logo URL" name="logoUrl" placeholder="https://..." />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
