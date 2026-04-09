"use client";
import { useState, useTransition } from "react";
import Modal from "./Modal";
import { Field, SelectField, FormActions } from "./FormFields";
import { updateProgramme } from "@/lib/actions";
import { Translation, ProgrammeStatus } from "@prisma/client";

type Programme = {
  id: string; title: string;
  defaultTranslation: Translation;
  defaultReferenceAuthor: string | null;
  status: ProgrammeStatus;
};

export default function EditProgrammeModal({
  programme,
  onClose,
}: {
  programme: Programme;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("id", programme.id);
    startTransition(async () => {
      try { await updateProgramme(fd); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    });
  }

  return (
    <Modal title="Edit Programme" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Programme Title" name="title" required defaultValue={programme.title} />
        <SelectField
          label="Default Translation" name="defaultTranslation" required
          defaultValue={programme.defaultTranslation}
          options={[
            { value: "KJV",     label: "KJV — King James Version" },
            { value: "PASSION", label: "Passion Translation" },
            { value: "NLT",     label: "NLT — New Living Translation" },
          ]}
        />
        <Field label="Default Reference Author" name="defaultReferenceAuthor"
          defaultValue={programme.defaultReferenceAuthor ?? ""} />
        <SelectField
          label="Status" name="status" required defaultValue={programme.status}
          options={[
            { value: "ACTIVE",   label: "Active" },
            { value: "PAUSED",   label: "Paused" },
            { value: "COMPLETE", label: "Complete" },
          ]}
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <FormActions onClose={onClose} submitting={pending} />
      </form>
    </Modal>
  );
}
