"use client";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { setupNewClient } from "@/lib/actions";
import { useReferenceAuthors } from "@/lib/useReferenceAuthors";
import { Translation, SizeCategory } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type VoiceProfile = {
  tone: string[];
  style: string;
  culturalMarkers: string[];
  culturalBackground: string;
  referenceAuthor: string;
  referenceAuthorReason: string;
  suggestedTranslation: string;
  translationReason: string;
  keyThemes: string[];
  illustrationStyle: string;
  confidence: string;
};

type BookRow = {
  id: string;
  number: number;
  title: string;
  translation: Translation;
  sizeCategory: SizeCategory;
  referenceAuthor: string;
};

const TRANSLATIONS: { value: Translation; label: string }[] = [
  { value: "KJV",     label: "KJV" },
  { value: "PASSION", label: "Passion" },
  { value: "NLT",     label: "NLT" },
];

const SIZES: { value: SizeCategory; label: string }[] = [
  { value: "FULL",        label: "Full (100–150pp)" },
  { value: "MEDIUM_FULL", label: "Med-Full (75–120pp)" },
  { value: "MEDIUM",      label: "Medium (55–90pp)" },
  { value: "SHORT",       label: "Short (30–65pp)" },
];

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["Ministry", "Author", "Voice Profile", "Programme", "Books"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((name, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                done   ? "bg-green-500 text-white" :
                active ? "bg-stone-800 text-white" :
                         "bg-stone-100 text-stone-400"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? "text-stone-700" : "text-stone-400"}`}>
                {name}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 mx-1 mb-4 transition-colors ${done ? "bg-green-400" : "bg-stone-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field helpers (inline, no separate component file) ────────────────────────
function F({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-stone-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400";
const selectCls = inputCls + " bg-white";

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Ministry
  const [ministry, setMinistry] = useState({ name: "", slug: "", logoUrl: "" });

  // Reference authors from DB
  const { authors: refAuthors } = useReferenceAuthors();

  // Step 2 — Author
  const [author, setAuthor] = useState({ name: "", credentials: "", bioText: "" });
  const [sample, setSample] = useState("");
  const [deducing, setDeducing] = useState(false);
  const [deduceStream, setDeduceStream] = useState("");

  // Step 3 — Voice profile (AI output + editable)
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [voiceEdit, setVoiceEdit] = useState<VoiceProfile | null>(null);

  // Step 4 — Programme
  const [programme, setProgramme] = useState({
    title: "", defaultTranslation: "KJV" as Translation, defaultReferenceAuthor: "",
  });

  // Step 5 — Books
  const [books, setBooks] = useState<BookRow[]>([
    { id: "1", number: 1, title: "", translation: "KJV", sizeCategory: "FULL", referenceAuthor: "" },
  ]);

  const abortRef = useRef<AbortController | null>(null);

  // ── Auto-generate slug ──────────────────────────────────────────────────────
  function handleMinistryName(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setMinistry({ ...ministry, name, slug });
  }

  // ── AI voice deduction ──────────────────────────────────────────────────────
  async function deduceVoice() {
    if (!sample.trim()) return;
    setDeducing(true);
    setDeduceStream("");
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/setup/deduce-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample, authorName: author.name }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Deduction failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setDeduceStream(full);
      }

      // Parse the JSON response — extract between first { and last } to handle markdown fences
      const start = full.indexOf("{");
      const end = full.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON found in response");
      const parsed = JSON.parse(full.slice(start, end + 1)) as VoiceProfile;
      setVoice(parsed);
      setVoiceEdit({ ...parsed });

      // Pre-fill programme fields from deduction
      setProgramme((p) => ({
        ...p,
        defaultTranslation: (parsed.suggestedTranslation as Translation) || p.defaultTranslation,
        defaultReferenceAuthor: parsed.referenceAuthor || p.defaultReferenceAuthor,
      }));

      // Pre-fill books translation
      setBooks((prev) => prev.map((b) => ({
        ...b,
        translation: (parsed.suggestedTranslation as Translation) || b.translation,
        referenceAuthor: parsed.referenceAuthor || b.referenceAuthor,
      })));

      setStep(2); // advance to voice review
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Voice deduction failed. You can skip and fill in manually.");
      }
    } finally {
      setDeducing(false);
    }
  }

  // ── Book row management ─────────────────────────────────────────────────────
  function addBookRow() {
    const next = books.length > 0 ? Math.max(...books.map((b) => b.number)) + 1 : 1;
    const last = books[books.length - 1];
    setBooks([...books, {
      id: String(Date.now()),
      number: next,
      title: "",
      translation: last?.translation ?? "KJV",
      sizeCategory: last?.sizeCategory ?? "FULL",
      referenceAuthor: last?.referenceAuthor ?? "",
    }]);
  }

  function updateBook(id: string, field: keyof BookRow, value: string | number) {
    setBooks((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
  }

  function removeBook(id: string) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  // ── Final submit ────────────────────────────────────────────────────────────
  function handleSubmit() {
    setError(null);
    setSubmitting(true);
    startTransition(async () => {
      try {
        const vp = voiceEdit ?? voice;
        const { ministryId } = await setupNewClient({
          ministry: { name: ministry.name, slug: ministry.slug, logoUrl: ministry.logoUrl },
          author: {
            name: author.name,
            credentials: author.credentials,
            bioText: author.bioText,
            voiceProfile: vp ? {
              tone: vp.tone,
              style: vp.style,
              keyThemes: vp.keyThemes,
              illustrationStyle: vp.illustrationStyle,
            } : {},
            culturalContext: vp ? {
              background: vp.culturalBackground,
              markers: vp.culturalMarkers,
            } : {},
          },
          programme: {
            title: programme.title,
            defaultTranslation: programme.defaultTranslation,
            defaultReferenceAuthor: programme.defaultReferenceAuthor,
          },
          books: books
            .filter((b) => b.title.trim())
            .map((b) => ({
              number: b.number,
              title: b.title,
              translation: b.translation,
              sizeCategory: b.sizeCategory,
              referenceAuthor: b.referenceAuthor,
            })),
        });
        router.push(`/ministries/${ministryId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Setup failed");
        setSubmitting(false);
      }
    });
  }

  // ── Validation per step ─────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 0) return !!ministry.name.trim();
    if (step === 1) return !!author.name.trim();
    if (step === 2) return true; // voice review always passable
    if (step === 3) return !!programme.title.trim();
    if (step === 4) return books.some((b) => b.title.trim());
    return true;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">New Client Setup</h1>
        <p className="text-sm text-stone-500 mt-1">
          Set up a new ministry client in one guided flow.
        </p>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Step 0: Ministry ── */}
      {step === 0 && (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Ministry Details</h2>
          <F label="Ministry Name" required>
            <input className={inputCls} value={ministry.name}
              onChange={(e) => handleMinistryName(e.target.value)}
              placeholder="e.g. Graceway Fountain Ministries" />
          </F>
          <F label="Slug">
            <input className={inputCls} value={ministry.slug}
              onChange={(e) => setMinistry({ ...ministry, slug: e.target.value })}
              placeholder="auto-generated" />
          </F>
          <F label="Logo URL">
            <input className={inputCls} value={ministry.logoUrl}
              onChange={(e) => setMinistry({ ...ministry, logoUrl: e.target.value })}
              placeholder="https://…" />
          </F>
        </div>
      )}

      {/* ── Step 1: Author ── */}
      {step === 1 && (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Author Details</h2>
          <F label="Full Name" required>
            <input className={inputCls} value={author.name}
              onChange={(e) => setAuthor({ ...author, name: e.target.value })}
              placeholder="Rev. Dr. Kwame Kusi-Boadum" />
          </F>
          <F label="Credentials">
            <input className={inputCls} value={author.credentials}
              onChange={(e) => setAuthor({ ...author, credentials: e.target.value })}
              placeholder="DTh, MBA, BSc" />
          </F>
          <F label="Bio">
            <textarea className={inputCls + " resize-none"} rows={3} value={author.bioText}
              onChange={(e) => setAuthor({ ...author, bioText: e.target.value })}
              placeholder="Brief biography…" />
          </F>

          <div className="mt-5 border-t border-stone-100 pt-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-stone-700">AI Voice Profile Deduction</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Paste a sermon excerpt — Claude will deduce tone, style, cultural markers, and reference author.
                </p>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Optional</span>
            </div>
            <textarea
              className={inputCls + " resize-y mt-2"}
              rows={6}
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder="Paste a sample sermon transcript or excerpt here (500–2000 words works best)…"
            />
            {deduceStream && !voice && (
              <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded text-xs text-stone-500 font-mono max-h-32 overflow-y-auto">
                {deduceStream}
                <span className="inline-block w-1.5 h-3 bg-amber-500 ml-0.5 animate-pulse" />
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={deduceVoice}
                disabled={deducing || !sample.trim()}
                className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-40 font-medium transition-colors"
              >
                {deducing ? "Analysing…" : "Deduce Voice Profile with AI"}
              </button>
              {deducing && (
                <button onClick={() => abortRef.current?.abort()}
                  className="text-xs text-stone-400 hover:text-stone-600">Stop</button>
              )}
              {!sample.trim() && (
                <button onClick={() => setStep(2)}
                  className="text-xs text-stone-400 hover:text-stone-600 underline">
                  Skip — fill in manually
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Voice Review ── */}
      {step === 2 && (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Voice Profile Review</h2>
            {voice?.confidence && (
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                voice.confidence === "high"   ? "bg-green-50 text-green-700" :
                voice.confidence === "medium" ? "bg-amber-50 text-amber-700" :
                "bg-stone-100 text-stone-500"}`}>
                {voice.confidence} confidence
              </span>
            )}
          </div>

          {!voiceEdit ? (
            <div className="py-8 text-center text-sm text-stone-400">
              <p>No AI deduction was run.</p>
              <p className="mt-1 text-xs">Fill in the fields below manually.</p>
            </div>
          ) : null}

          {voiceEdit && (
            <div className="space-y-3">
              <F label="Tone descriptors (comma-separated)">
                <input className={inputCls} value={voiceEdit.tone.join(", ")}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, tone: e.target.value.split(",").map((t) => t.trim()) })}
                />
              </F>
              <F label="Style summary">
                <textarea className={inputCls + " resize-none"} rows={2}
                  value={voiceEdit.style}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, style: e.target.value })} />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Reference Author">
                  <select className={selectCls} value={voiceEdit.referenceAuthor}
                    onChange={(e) => setVoiceEdit({ ...voiceEdit, referenceAuthor: e.target.value })}>
                    {refAuthors.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </F>
                <F label="Suggested Translation">
                  <select className={selectCls} value={voiceEdit.suggestedTranslation}
                    onChange={(e) => setVoiceEdit({ ...voiceEdit, suggestedTranslation: e.target.value })}>
                    {["KJV", "PASSION", "NLT"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </F>
              </div>
              {voiceEdit.referenceAuthorReason && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">AI Reasoning</p>
                  <p className="text-xs text-stone-600">{voiceEdit.referenceAuthorReason}</p>
                  {voiceEdit.translationReason && (
                    <p className="text-xs text-stone-600 mt-1">{voiceEdit.translationReason}</p>
                  )}
                </div>
              )}
              <F label="Cultural background">
                <input className={inputCls} value={voiceEdit.culturalBackground}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, culturalBackground: e.target.value })} />
              </F>
              <F label="Cultural markers (comma-separated)">
                <input className={inputCls} value={voiceEdit.culturalMarkers.join(", ")}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, culturalMarkers: e.target.value.split(",").map((m) => m.trim()) })} />
              </F>
              <F label="Key themes (comma-separated)">
                <input className={inputCls} value={voiceEdit.keyThemes.join(", ")}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, keyThemes: e.target.value.split(",").map((t) => t.trim()) })} />
              </F>
              <F label="Illustration style">
                <textarea className={inputCls + " resize-none"} rows={2}
                  value={voiceEdit.illustrationStyle}
                  onChange={(e) => setVoiceEdit({ ...voiceEdit, illustrationStyle: e.target.value })} />
              </F>
            </div>
          )}

          {!voiceEdit && (
            <div className="space-y-3 mt-4">
              <F label="Tone descriptors (comma-separated)">
                <input className={inputCls} placeholder="Bold and declarative, Pastoral, Direct"
                  onChange={(e) => setVoiceEdit({
                    tone: e.target.value.split(",").map((t) => t.trim()),
                    style: "", culturalMarkers: [], culturalBackground: "",
                    referenceAuthor: refAuthors[0]?.name ?? "Oyedepo", referenceAuthorReason: "",
                    suggestedTranslation: "KJV", translationReason: "",
                    keyThemes: [], illustrationStyle: "", confidence: "low",
                  })} />
              </F>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Programme ── */}
      {step === 3 && (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Publishing Programme</h2>
          <F label="Programme Title" required>
            <input className={inputCls} value={programme.title}
              onChange={(e) => setProgramme({ ...programme, title: e.target.value })}
              placeholder="e.g. 40-Book Publishing Programme" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Default Translation">
              <select className={selectCls} value={programme.defaultTranslation}
                onChange={(e) => setProgramme({ ...programme, defaultTranslation: e.target.value as Translation })}>
                {TRANSLATIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
            <F label="Default Reference Author">
              <input className={inputCls} value={programme.defaultReferenceAuthor}
                onChange={(e) => setProgramme({ ...programme, defaultReferenceAuthor: e.target.value })}
                placeholder="e.g. Oyedepo" />
            </F>
          </div>
          {voiceEdit && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Pre-filled from AI deduction — translation: <strong>{voiceEdit.suggestedTranslation}</strong>,
              reference: <strong>{voiceEdit.referenceAuthor}</strong>. Adjust if needed.
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Books ── */}
      {step === 4 && (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-700">Books</h2>
              <p className="text-xs text-stone-400 mt-0.5">Add all books for this programme. You can add more later.</p>
            </div>
            <button onClick={addBookRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-100 text-stone-700 border border-stone-200 rounded hover:bg-stone-200 transition-colors font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400 w-12">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400">Title</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400 w-28">Translation</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400 w-36">Size</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400 w-28">Ref. Author</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {books.map((b) => (
                  <tr key={b.id} className="group">
                    <td className="px-3 py-2">
                      <input type="number" value={b.number}
                        onChange={(e) => updateBook(b.id, "number", parseInt(e.target.value) || 1)}
                        className="w-10 border border-stone-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={b.title} placeholder="Book title…"
                        onChange={(e) => updateBook(b.id, "title", e.target.value)}
                        className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={b.translation}
                        onChange={(e) => updateBook(b.id, "translation", e.target.value)}
                        className="w-full border border-stone-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        {TRANSLATIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={b.sizeCategory}
                        onChange={(e) => updateBook(b.id, "sizeCategory", e.target.value)}
                        className="w-full border border-stone-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={b.referenceAuthor} placeholder="Oyedepo"
                        onChange={(e) => updateBook(b.id, "referenceAuthor", e.target.value)}
                        className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-2 py-2">
                      {books.length > 1 && (
                        <button onClick={() => removeBook(b.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400">
            {books.filter((b) => b.title.trim()).length} of {books.length} books have titles
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)); }}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-stone-500 hover:text-stone-800 font-medium disabled:opacity-0 transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {step < 4 ? (
            <button
              onClick={() => { setError(null); setStep((s) => s + 1); }}
              disabled={!canAdvance()}
              className="px-5 py-2 text-sm bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-40 font-medium transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canAdvance()}
              className="px-6 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-40 font-semibold transition-colors"
            >
              {submitting ? "Creating…" : "Create Client & Books →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
