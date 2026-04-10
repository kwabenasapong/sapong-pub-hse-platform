"use client";
import { useState, useTransition } from "react";
import { MasterInstructions } from "@/lib/master-instructions";

type PlaceCorrection = { wrong: string; correct: string };
type MinistryContacts = {
  address?: string; website?: string; email?: string; phone?: string;
  facebook?: string; instagram?: string; youtube?: string; tiktok?: string;
};

type Props = {
  programmeId: string;
  initial: MasterInstructions | null;
  onSaved?: () => void;
};

const inputCls = "w-full border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400";
const labelCls = "block text-xs font-medium text-stone-500 mb-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function ProgrammeInstructionsEditor({ programmeId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — initialised from existing data
  const [authorTitle,       setAuthorTitle]       = useState(initial?.authorTitle ?? "");
  const [neverUseTitle,     setNeverUseTitle]      = useState(initial?.neverUseTitle ?? "");
  const [familyContext,     setFamilyContext]      = useState(initial?.familyContext ?? "");
  const [professionalCtx,   setProfessionalCtx]   = useState(initial?.professionalContext ?? "");
  const [corrections,       setCorrections]        = useState<string[]>(initial?.standingCorrections ?? [""]);
  const [places,            setPlaces]             = useState<PlaceCorrection[]>(
    initial?.placeCorrections ?? [{ wrong: "", correct: "" }]
  );
  const [contacts, setContacts] = useState<MinistryContacts>(initial?.ministryContacts ?? {});

  function updateContact(key: keyof MinistryContacts, value: string) {
    setContacts((c) => ({ ...c, [key]: value }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const masterInstructions: MasterInstructions = {
          authorTitle:          authorTitle || undefined,
          neverUseTitle:        neverUseTitle || undefined,
          familyContext:        familyContext || undefined,
          professionalContext:  professionalCtx || undefined,
          standingCorrections:  corrections.filter(Boolean),
          placeCorrections:     places.filter((p) => p.wrong && p.correct),
          ministryContacts:     Object.keys(contacts).length > 0 ? contacts : undefined,
        };

        const res = await fetch(`/api/programmes/${programmeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterInstructions }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="mt-4 border border-stone-200 rounded-lg overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-stone-700">Programme Instructions</span>
          {initial && Object.keys(initial).length > 0 && (
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
              Configured
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-5 space-y-6 bg-white">
          <p className="text-xs text-stone-400">
            These instructions are layered on top of the platform master instructions for every AI run
            in this programme. They define client-specific rules, corrections, and contact details.
          </p>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Author title */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Author Title</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Always use this title">
                <input className={inputCls} value={authorTitle}
                  onChange={(e) => setAuthorTitle(e.target.value)}
                  placeholder="e.g. Founder and Senior Pastor" />
              </Field>
              <Field label="Never use this title">
                <input className={inputCls} value={neverUseTitle}
                  onChange={(e) => setNeverUseTitle(e.target.value)}
                  placeholder="e.g. Head Pastor" />
              </Field>
            </div>
          </div>

          {/* Personal context */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Personal Context</h3>
            <div className="space-y-3">
              <Field label="Family context">
                <input className={inputCls} value={familyContext}
                  onChange={(e) => setFamilyContext(e.target.value)}
                  placeholder="e.g. Married to Lady Pastor Rose; three children" />
              </Field>
              <Field label="Professional context">
                <textarea className={inputCls + " resize-none"} rows={2}
                  value={professionalCtx}
                  onChange={(e) => setProfessionalCtx(e.target.value)}
                  placeholder="e.g. MD of PrecisionWorks Engineering Ltd; President, Apostolic Revival Network…" />
              </Field>
            </div>
          </div>

          {/* Place name corrections */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Place Name Corrections</h3>
            <div className="space-y-2">
              {places.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={inputCls} value={p.wrong}
                    onChange={(e) => setPlaces((prev) => prev.map((x, j) => j === i ? { ...x, wrong: e.target.value } : x))}
                    placeholder="Wrong name" />
                  <span className="text-stone-400 text-sm flex-shrink-0">→</span>
                  <input className={inputCls} value={p.correct}
                    onChange={(e) => setPlaces((prev) => prev.map((x, j) => j === i ? { ...x, correct: e.target.value } : x))}
                    placeholder="Correct name" />
                  {places.length > 1 && (
                    <button onClick={() => setPlaces((prev) => prev.filter((_, j) => j !== i))}
                      className="text-stone-300 hover:text-red-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setPlaces((prev) => [...prev, { wrong: "", correct: "" }])}
                className="text-xs text-amber-700 hover:text-amber-600 font-medium">
                + Add correction
              </button>
            </div>
          </div>

          {/* Standing corrections */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Standing Corrections</h3>
            <div className="space-y-2">
              {corrections.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={inputCls} value={c}
                    onChange={(e) => setCorrections((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                    placeholder='e.g. Use "Prayer" not "Prayer of Activation"' />
                  {corrections.length > 1 && (
                    <button onClick={() => setCorrections((prev) => prev.filter((_, j) => j !== i))}
                      className="text-stone-300 hover:text-red-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setCorrections((prev) => [...prev, ""])}
                className="text-xs text-amber-700 hover:text-amber-600 font-medium">
                + Add correction
              </button>
            </div>
          </div>

          {/* Ministry contacts */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Ministry Contacts</h3>
            <div className="grid grid-cols-2 gap-3">
              {([ 
                ["address",   "Address"],
                ["website",   "Website"],
                ["email",     "Email"],
                ["phone",     "Phone"],
                ["facebook",  "Facebook URL"],
                ["instagram", "Instagram URL"],
                ["youtube",   "YouTube URL"],
                ["tiktok",    "TikTok URL"],
              ] as [keyof MinistryContacts, string][]).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input className={inputCls}
                    value={contacts[key] ?? ""}
                    onChange={(e) => updateContact(key, e.target.value)}
                    placeholder={key === "address" ? "Accra, Ghana" : "https://…"} />
                </Field>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
            <button onClick={save} disabled={pending}
              className="px-5 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
              {pending ? "Saving…" : "Save Instructions"}
            </button>
            {saved && <span className="text-xs text-green-600 font-medium">✓ Saved — will apply to all future AI runs</span>}
          </div>
        </div>
      )}
    </div>
  );
}
