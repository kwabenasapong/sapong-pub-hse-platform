"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkflowStatus, BookStatus, Translation, SizeCategory, ChapterStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStep = {
  id: string; stepNumber: number; stepName: string;
  status: WorkflowStatus; outputText: string | null;
  feedback: string | null; notes: string | null; completedAt: Date | null;
};
type Chapter = {
  id: string; chapterNumber: number; title: string | null;
  status: ChapterStatus; wordCount: number | null;
  draftText: string | null; approvedText: string | null;
};
type Transcript = { id: string; filename: string; orderIndex: number };
type Book = {
  id: string; title: string; number: number; status: BookStatus;
  translation: Translation; sizeCategory: SizeCategory;
  referenceAuthor: string | null;
  targetWordCountMin: number | null; targetWordCountMax: number | null;
  author: { name: string; voiceProfile: unknown; culturalContext: unknown };
  workflowSteps: WorkflowStep[];
  chapters: Chapter[];
  transcripts: Transcript[];
};

// ── Revert Confirmation Dialog ────────────────────────────────────────────────
function RevertDialog({
  stepNumber, stepName, onConfirm, onCancel,
}: {
  stepNumber: number; stepName: string;
  onConfirm: (cascade: boolean) => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
        <h3 className="text-sm font-semibold text-stone-800 mb-2">Revert Step {stepNumber}: {stepName}?</h3>
        <p className="text-xs text-stone-500 mb-4">
          Choose how far back you want to go. You can keep downstream work or wipe it.
        </p>
        <div className="space-y-2 mb-4">
          <button
            onClick={() => onConfirm(false)}
            className="w-full text-left px-4 py-3 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <p className="text-sm font-medium text-amber-800">Revert this step only</p>
            <p className="text-xs text-amber-600 mt-0.5">Re-opens Step {stepNumber} for editing. Downstream steps stay as-is.</p>
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="w-full text-left px-4 py-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <p className="text-sm font-medium text-red-800">Revert this step + reset all downstream</p>
            <p className="text-xs text-red-600 mt-0.5">
              Steps {stepNumber + 1}–5 will be cleared.
              {stepNumber <= 3 ? " All chapter drafts will be wiped." : ""}
              {stepNumber === 1 ? " Transcripts will be deleted." : ""}
            </p>
          </button>
        </div>
        <button onClick={onCancel} className="w-full text-xs text-stone-400 hover:text-stone-600 py-1">Cancel</button>
      </div>
    </div>
  );
}

// ── Notes Panel ───────────────────────────────────────────────────────────────
function NotesPanel({
  stepNumber, bookId, initialNotes, disabled,
}: {
  stepNumber: number; bookId: string; initialNotes: string | null; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, stepNumber, notes, action: "save_notes" }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mt-3 border border-stone-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notes for AI {notes ? <span className="text-amber-600">·</span> : ""}
          {notes ? " (has content)" : " — add context, gaps, extra instructions"}
        </span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="p-3 bg-white">
          <p className="text-xs text-stone-400 mb-2">
            Anything written here is injected directly into the AI prompt for this step.
            Use it for gap-filling, extra context, corrections, or additional sermon references.
          </p>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            disabled={disabled}
            rows={4}
            placeholder="e.g. The pastor also covered this theme in a later sermon — weave in the story about the Accra branch opening. Make sure to address the gap around covenant renewal…"
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y disabled:bg-stone-50 disabled:text-stone-400"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving || disabled}
              className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-600 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Notes"}
            </button>
            <p className="text-xs text-stone-400">Saved notes are used on next AI run for this step.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feedback Display ──────────────────────────────────────────────────────────
function FeedbackBanner({ feedback }: { feedback: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-amber-600 hover:underline mb-2">
      Show previous feedback
    </button>
  );
  return (
    <div className="mb-3 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-amber-700">Previous feedback</p>
        <button onClick={() => setOpen(false)} className="text-xs text-amber-500 hover:text-amber-700">Hide</button>
      </div>
      <p className="text-xs text-amber-700 whitespace-pre-wrap">{feedback}</p>
    </div>
  );
}

// ── Approve Bar ───────────────────────────────────────────────────────────────
function ApproveBar({
  onApprove, onRequestChanges, approving,
}: {
  onApprove: () => void; onRequestChanges: (fb: string) => void; approving: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  return (
    <div className="mt-3 space-y-2">
      {showFeedback ? (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what needs to change…"
            rows={3}
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onRequestChanges(feedback); setShowFeedback(false); setFeedback(""); }}
              disabled={!feedback.trim()}
              className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-600 disabled:opacity-40 transition-colors"
            >
              Submit &amp; Regenerate
            </button>
            <button onClick={() => setShowFeedback(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={onApprove} disabled={approving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 transition-colors font-medium">
            {approving ? "Approving…" : "✓ Approve"}
          </button>
          <button onClick={() => setShowFeedback(true)}
            className="px-4 py-2 text-sm bg-stone-100 text-stone-700 border border-stone-200 rounded hover:bg-stone-200 transition-colors">
            Request Changes
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step Header ───────────────────────────────────────────────────────────────
function StepHeader({
  number, name, status, expanded, onClick,
}: {
  number: number; name: string; status: WorkflowStatus; expanded: boolean; onClick: () => void;
}) {
  const colors: Record<WorkflowStatus, string> = {
    APPROVED: "bg-green-50 border-green-200",
    IN_PROGRESS: "bg-amber-50 border-amber-200",
    PENDING: "bg-stone-50 border-stone-200",
  };
  const icons: Record<WorkflowStatus, string> = { APPROVED: "✓", IN_PROGRESS: "●", PENDING: "○" };
  const textColors: Record<WorkflowStatus, string> = {
    APPROVED: "text-green-700", IN_PROGRESS: "text-amber-700", PENDING: "text-stone-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={status === "PENDING"}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${colors[status]} ${status !== "PENDING" ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-sm font-mono w-4 ${textColors[status]}`}>{icons[status]}</span>
        <span className={`text-sm font-semibold ${textColors[status]}`}>Step {number}: {name}</span>
        {status === "APPROVED" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approved</span>}
        {status === "IN_PROGRESS" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Active</span>}
      </div>
      {status !== "PENDING" && (
        <svg className={`w-4 h-4 transition-transform ${textColors[status]} ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

// ── AI Output ─────────────────────────────────────────────────────────────────
function AIOutput({ text, streaming }: { text: string; streaming: boolean }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (streaming && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, streaming]);
  return (
    <pre ref={ref} className="whitespace-pre-wrap text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto leading-relaxed">
      {text}
      {streaming && <span className="inline-block w-1.5 h-4 bg-amber-500 ml-0.5 animate-pulse" />}
    </pre>
  );
}

// ── Approved Step Footer ──────────────────────────────────────────────────────
function ApprovedFooter({
  onRevert, onRegenerate, streaming,
}: {
  onRevert: () => void; onRegenerate: () => void; streaming: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="text-xs text-green-600 font-medium">✓ Approved</span>
      <span className="text-stone-300">·</span>
      <button onClick={onRegenerate} disabled={streaming}
        className="text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40">
        Regenerate
      </button>
      <span className="text-stone-300">·</span>
      <button onClick={onRevert}
        className="text-xs text-amber-600 hover:text-amber-800 transition-colors font-medium">
        Revert
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookWorkflow({ book }: { book: Book }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(() => {
    const active = book.workflowSteps.find((s) => s.status === "IN_PROGRESS");
    const firstPending = book.workflowSteps.find((s) => s.status === "PENDING");
    return active?.stepNumber ?? firstPending?.stepNumber ?? 1;
  });
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState(false);
  const [activeChapter, setActiveChapter] = useState(1);
  const [revertTarget, setRevertTarget] = useState<{ stepNumber: number; stepName: string } | null>(null);
  const [transcriptInputs, setTranscriptInputs] = useState<Array<{ filename: string; rawText: string }>>(
    [{ filename: "Transcript 1", rawText: "" }]
  );
  const [savingTranscripts, setSavingTranscripts] = useState(false);
  const [extractingIdx, setExtractingIdx] = useState<number | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const streamKey = (step: number, ch?: number) => ch ? `step${step}_ch${ch}` : `step${step}`;
  const step = (n: number) => book.workflowSteps.find((s) => s.stepNumber === n)!;

  const getStepText = (n: number, chNum?: number): string => {
    const key = streamKey(n, chNum);
    if (streamText[key]) return streamText[key];
    if (chNum) {
      const ch = book.chapters.find((c) => c.chapterNumber === chNum);
      return ch?.draftText ?? ch?.approvedText ?? "";
    }
    return step(n)?.outputText ?? "";
  };

  const runAI = useCallback(async (stepNumber: number, chapterNumber?: number, feedback?: string) => {
    const key = streamKey(stepNumber, chapterNumber);
    setStreamText((prev) => ({ ...prev, [key]: "" }));
    setStreaming(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, stepNumber, chapterNumber, feedback }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setStreamText((prev) => ({ ...prev, [key]: (prev[key] ?? "") + decoder.decode(value, { stream: true }) }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamText((prev) => ({ ...prev, [key]: (prev[key] ?? "") + "\n\n[Generation stopped]" }));
      }
    } finally {
      setStreaming(false);
      router.refresh();
    }
  }, [book.id, router]);

  const callApprove = useCallback(async (body: object, cascade?: boolean) => {
    setApproving(true);
    await fetch("/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cascade !== undefined ? { "x-cascade": String(cascade) } : {}) },
      body: JSON.stringify(body),
    });
    setApproving(false);
    router.refresh();
  }, [router]);

  const approveStep = (n: number) => callApprove({ bookId: book.id, stepNumber: n, action: "approve" });
  const approveChapter = (n: number) => callApprove({ bookId: book.id, chapterNumber: n, action: "approve_chapter" });
  const reopenChapter = (n: number) => callApprove({ bookId: book.id, chapterNumber: n, action: "reopen_chapter" });

  const requestChanges = useCallback(async (stepNumber: number, feedback: string, chapterNumber?: number) => {
    await callApprove({ bookId: book.id, stepNumber, feedback, action: "request_changes" });
    await runAI(stepNumber, chapterNumber, feedback);
  }, [book.id, callApprove, runAI]);

  const revert = useCallback(async (stepNumber: number, cascade: boolean) => {
    setRevertTarget(null);
    // Clear stream text for this step and all downstream
    setStreamText({});
    await callApprove({ bookId: book.id, stepNumber, action: "revert" }, cascade);
    setExpanded(stepNumber);
  }, [book.id, callApprove]);

  const handleFileUpload = useCallback(async (idx: number, file: File) => {
    setExtractingIdx(idx);
    setExtractError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTranscriptInputs((prev) => prev.map((x, j) =>
        j === idx ? { ...x, filename: file.name, rawText: data.text } : x
      ));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingIdx(null);
    }
  }, []);

  const saveTranscripts = useCallback(async () => {
    setSavingTranscripts(true);
    const valid = transcriptInputs.filter((t) => t.rawText.trim());
    await fetch("/api/workflow/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: book.id,
        transcripts: valid.map((t, i) => ({ ...t, orderIndex: i + 1 })),
      }),
    });
    setSavingTranscripts(false);
    router.refresh();
  }, [book.id, transcriptInputs, router]);

  const expectedChapters = { FULL: 10, MEDIUM_FULL: 8, MEDIUM: 6, SHORT: 4 }[book.sizeCategory] ?? 6;
  const approvedChapters = book.chapters.filter((c) => c.status === "APPROVED").length;
  const allChaptersApproved = approvedChapters >= expectedChapters;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {revertTarget && (
        <RevertDialog
          stepNumber={revertTarget.stepNumber}
          stepName={revertTarget.stepName}
          onConfirm={(cascade) => revert(revertTarget.stepNumber, cascade)}
          onCancel={() => setRevertTarget(null)}
        />
      )}

      <div className="space-y-2">

        {/* ── STEP 1: INTAKE ── */}
        <div>
          <StepHeader number={1} name="Intake" status={step(1).status}
            expanded={expanded === 1} onClick={() => setExpanded(expanded === 1 ? null : 1)} />
          {expanded === 1 && (
            <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
              {step(1).status === "APPROVED" ? (
                <div>
                  <p className="text-sm text-green-600 font-medium mb-2">
                    ✓ {book.transcripts.length} transcript{book.transcripts.length !== 1 ? "s" : ""} saved
                  </p>
                  {book.transcripts.map((t) => (
                    <p key={t.id} className="text-xs text-stone-400">· {t.filename}</p>
                  ))}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => setRevertTarget({ stepNumber: 1, stepName: "Intake" })}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                    >
                      Edit Transcripts
                    </button>
                    <span className="text-stone-300 text-xs">·</span>
                    <span className="text-xs text-stone-400">Warning: editing transcripts will cascade-reset downstream steps.</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-stone-500">
                      Add each sermon transcript — paste text or upload a file (.txt, .docx, .pdf).
                    </p>
                    <span className="text-xs text-stone-400">Max 10MB per file</span>
                  </div>

                  {extractError && (
                    <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
                      {extractError}
                      <button onClick={() => setExtractError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {transcriptInputs.map((t, i) => (
                      <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
                        {/* Transcript header */}
                        <div className="flex items-center justify-between bg-stone-50 px-3 py-2 border-b border-stone-200">
                          <input
                            value={t.filename}
                            onChange={(e) => setTranscriptInputs((prev) => prev.map((x, j) => j === i ? { ...x, filename: e.target.value } : x))}
                            className="text-xs font-medium text-stone-600 bg-transparent focus:outline-none flex-1 min-w-0 mr-3"
                          />
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* File upload button */}
                            <label className={`cursor-pointer text-xs px-2 py-1 rounded border transition-colors ${
                              extractingIdx === i
                                ? "bg-stone-100 text-stone-400 border-stone-200 cursor-wait"
                                : "bg-white text-stone-500 border-stone-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                            }`}>
                              {extractingIdx === i ? (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                  Extracting…
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                  </svg>
                                  Upload file
                                </span>
                              )}
                              <input
                                type="file"
                                accept=".txt,.docx,.pdf"
                                className="hidden"
                                disabled={extractingIdx !== null}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(i, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {transcriptInputs.length > 1 && (
                              <button
                                onClick={() => setTranscriptInputs((prev) => prev.filter((_, j) => j !== i))}
                                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                              >Remove</button>
                            )}
                          </div>
                        </div>

                        {/* Text area — shows extracted content or paste */}
                        {t.rawText ? (
                          <div className="relative">
                            <textarea
                              value={t.rawText}
                              onChange={(e) => setTranscriptInputs((prev) => prev.map((x, j) => j === i ? { ...x, rawText: e.target.value } : x))}
                              rows={6}
                              className="w-full px-3 py-2 text-sm text-stone-700 focus:outline-none resize-y"
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] text-stone-300 pointer-events-none">
                              {t.rawText.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                            </div>
                          </div>
                        ) : (
                          <textarea
                            value={t.rawText}
                            onChange={(e) => setTranscriptInputs((prev) => prev.map((x, j) => j === i ? { ...x, rawText: e.target.value } : x))}
                            placeholder="Paste transcript text here, or upload a file above…"
                            rows={6}
                            className="w-full px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none resize-y"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => setTranscriptInputs((prev) => [
                        ...prev,
                        { filename: `Transcript ${prev.length + 1}`, rawText: "" }
                      ])}
                      className="text-xs text-amber-700 hover:text-amber-600 font-medium"
                    >
                      + Add Transcript
                    </button>
                    <button
                      onClick={saveTranscripts}
                      disabled={savingTranscripts || !transcriptInputs.some((t) => t.rawText.trim())}
                      className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-40 font-medium transition-colors"
                    >
                      {savingTranscripts ? "Saving…" : "Save Transcripts & Complete Intake"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STEPS 2, 3, 5 (single output steps) ── */}
        {([
          { n: 2, name: "Analysis Report", btn: "Run Analysis" },
          { n: 3, name: "Chapter Outline", btn: "Generate Outline" },
          { n: 5, name: "Front & Back Matter", btn: "Generate Front & Back Matter" },
        ] as const).map(({ n, name, btn }) => {
          const s = step(n);
          const text = getStepText(n);
          const isStreaming = streaming && streamText[streamKey(n)] !== undefined && !streamText[streamKey(n + 1)];

          return (
            <div key={n}>
              <StepHeader number={n} name={name} status={s.status}
                expanded={expanded === n} onClick={() => s.status !== "PENDING" && setExpanded(expanded === n ? null : n)} />
              {expanded === n && s.status !== "PENDING" && (
                <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
                  {s.feedback && <FeedbackBanner feedback={s.feedback} />}
                  <NotesPanel stepNumber={n} bookId={book.id} initialNotes={s.notes} />
                  <div className="mt-3">
                    {!text ? (
                      <div>
                        <p className="text-sm text-stone-500 mb-3">
                          {n === 2 && "Claude will read all transcripts and produce a full analysis report."}
                          {n === 3 && "Claude will propose the full chapter outline based on the approved analysis."}
                          {n === 5 && "Claude will draft Foreword, Preface, Introduction, Conclusion, Prayer, About the Author, and Ministry page."}
                        </p>
                        <button onClick={() => runAI(n)} disabled={streaming}
                          className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
                          {streaming ? "Generating…" : btn}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <AIOutput text={text} streaming={isStreaming} />
                        {s.status !== "APPROVED" && !isStreaming && (
                          <ApproveBar
                            onApprove={() => approveStep(n)}
                            onRequestChanges={(fb) => requestChanges(n, fb)}
                            approving={approving}
                          />
                        )}
                        {s.status === "APPROVED" && (
                          <>
                            <ApprovedFooter
                              onRevert={() => setRevertTarget({ stepNumber: n, stepName: name })}
                              onRegenerate={() => runAI(n)}
                              streaming={streaming}
                            />
                            {n === 5 && (
                              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                <p className="text-sm text-green-700 font-semibold">🎉 Book complete!</p>
                                <p className="text-xs text-green-600 mt-1">All 5 steps approved. Ready for DOCX export.</p>
                              </div>
                            )}
                          </>
                        )}
                        {!isStreaming && s.status !== "APPROVED" && (
                          <button onClick={() => runAI(n)} disabled={streaming}
                            className="mt-2 text-xs text-stone-400 hover:text-stone-600 transition-colors">
                            Regenerate without changes
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── STEP 4: CHAPTER DRAFTS ── */}
        {(() => {
          const s = step(4);
          return (
            <div>
              <StepHeader number={4} name="Chapter Drafts" status={s.status}
                expanded={expanded === 4} onClick={() => s.status !== "PENDING" && setExpanded(expanded === 4 ? null : 4)} />
              {expanded === 4 && s.status !== "PENDING" && (
                <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
                  {/* Chapter progress summary */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-stone-500">
                      {approvedChapters}/{expectedChapters} chapters approved
                    </p>
                    <div className="flex gap-2">
                      {allChaptersApproved && s.status !== "APPROVED" && (
                        <button onClick={() => approveStep(4)}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-500 font-medium transition-colors">
                          ✓ Mark All Drafts Complete
                        </button>
                      )}
                      {s.status === "APPROVED" && (
                        <button onClick={() => setRevertTarget({ stepNumber: 4, stepName: "Chapter Drafts" })}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors">
                          Revert
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes for this step */}
                  <NotesPanel stepNumber={4} bookId={book.id} initialNotes={s.notes} />

                  {/* Chapter tab grid */}
                  <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                    {Array.from({ length: expectedChapters }, (_, i) => i + 1).map((n) => {
                      const ch = book.chapters.find((c) => c.chapterNumber === n);
                      return (
                        <button key={n} onClick={() => setActiveChapter(n)}
                          className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                            activeChapter === n ? "bg-stone-800 text-white"
                            : ch?.status === "APPROVED" ? "bg-green-100 text-green-700 border border-green-200"
                            : ch?.draftText ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-stone-100 text-stone-500 border border-stone-200"
                          }`}>
                          Ch {n}{ch?.status === "APPROVED" ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active chapter panel */}
                  {(() => {
                    const ch = book.chapters.find((c) => c.chapterNumber === activeChapter);
                    const chKey = streamKey(4, activeChapter);
                    const text = getStepText(4, activeChapter);
                    const isStreaming = streaming && streamText[chKey] !== undefined;
                    return (
                      <div className="border border-stone-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
                          <div>
                            <p className="text-sm font-medium text-stone-700">
                              Chapter {activeChapter}{ch?.title ? `: ${ch.title}` : ""}
                            </p>
                            {ch?.wordCount && (
                              <p className="text-xs text-stone-400 mt-0.5">{ch.wordCount.toLocaleString()} words</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {ch?.status === "APPROVED" ? (
                              <>
                                <span className="text-xs text-green-600 font-medium">✓ Approved</span>
                                <button onClick={() => reopenChapter(activeChapter)}
                                  className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors ml-2">
                                  Re-open
                                </button>
                              </>
                            ) : (
                              <button onClick={() => runAI(4, activeChapter)} disabled={streaming}
                                className="px-3 py-1.5 text-xs bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
                                {isStreaming ? "Writing…" : text ? "Regenerate" : "Draft Chapter"}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          {text ? (
                            <div>
                              <AIOutput text={text} streaming={isStreaming} />
                              {ch?.status !== "APPROVED" && !isStreaming && (
                                <ApproveBar
                                  onApprove={() => approveChapter(activeChapter)}
                                  onRequestChanges={(fb) => requestChanges(4, fb, activeChapter)}
                                  approving={approving}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="py-8 text-center">
                              <p className="text-sm text-stone-400">
                                Click &ldquo;Draft Chapter&rdquo; to generate this chapter with Claude.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </>
  );
}
