"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WorkflowStatus, BookStatus, Translation, SizeCategory, ChapterStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStep = {
  id: string; stepNumber: number; stepName: string;
  status: WorkflowStatus; outputText: string | null; feedback: string | null; completedAt: Date | null;
};
type Chapter = {
  id: string; chapterNumber: number; title: string | null;
  status: ChapterStatus; wordCount: number | null; draftText: string | null; approvedText: string | null;
};
type Transcript = { id: string; filename: string; orderIndex: number };
type Book = {
  id: string; title: string; number: number; status: BookStatus;
  translation: Translation; sizeCategory: SizeCategory; referenceAuthor: string | null;
  targetWordCountMin: number | null; targetWordCountMax: number | null;
  author: { name: string; voiceProfile: unknown; culturalContext: unknown };
  workflowSteps: WorkflowStep[];
  chapters: Chapter[];
  transcripts: Transcript[];
};

// ── Helper components ─────────────────────────────────────────────────────────
function StepHeader({
  number, name, status, expanded, onClick,
}: {
  number: number; name: string; status: WorkflowStatus; expanded: boolean; onClick: () => void;
}) {
  const colors: Record<WorkflowStatus, string> = {
    APPROVED: "bg-green-50 border-green-200 text-green-700",
    IN_PROGRESS: "bg-amber-50 border-amber-200 text-amber-700",
    PENDING: "bg-stone-50 border-stone-200 text-stone-400",
  };
  const icons: Record<WorkflowStatus, string> = { APPROVED: "✓", IN_PROGRESS: "●", PENDING: "○" };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${colors[status]} ${status !== "PENDING" ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono w-4">{icons[status]}</span>
        <span className="text-sm font-semibold">Step {number}: {name}</span>
        {status === "APPROVED" && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approved</span>
        )}
        {status === "IN_PROGRESS" && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Active</span>
        )}
      </div>
      {status !== "PENDING" && (
        <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

function AIOutput({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto leading-relaxed">
        {text}
        {streaming && <span className="inline-block w-1.5 h-4 bg-amber-500 ml-0.5 animate-pulse" />}
      </pre>
    </div>
  );
}

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
              Submit Feedback &amp; Regenerate
            </button>
            <button onClick={() => setShowFeedback(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={approving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 transition-colors font-medium"
          >
            {approving ? "Approving…" : "✓ Approve"}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="px-4 py-2 text-sm bg-stone-100 text-stone-700 border border-stone-200 rounded hover:bg-stone-200 transition-colors"
          >
            Request Changes
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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

  // Transcript state
  const [transcriptInputs, setTranscriptInputs] = useState<Array<{ filename: string; rawText: string }>>(
    book.transcripts.length > 0
      ? book.transcripts.map((t) => ({ filename: t.filename, rawText: "" }))
      : [{ filename: "Transcript 1", rawText: "" }]
  );
  const [savingTranscripts, setSavingTranscripts] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const streamKey = (step: number, ch?: number) => ch ? `step${step}_ch${ch}` : `step${step}`;

  const runAI = useCallback(async (stepNumber: number, chapterNumber?: number, feedback?: string) => {
    const key = streamKey(stepNumber, chapterNumber);
    setStreamText((prev) => ({ ...prev, [key]: "" }));
    setStreaming(true);
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
        const chunk = decoder.decode(value, { stream: true });
        setStreamText((prev) => ({ ...prev, [key]: (prev[key] ?? "") + chunk }));
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

  const approve = useCallback(async (stepNumber: number) => {
    setApproving(true);
    await fetch("/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, stepNumber, action: "approve" }),
    });
    setApproving(false);
    router.refresh();
  }, [book.id, router]);

  const approveChapter = useCallback(async (chapterNumber: number) => {
    setApproving(true);
    await fetch("/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, chapterNumber, action: "approve_chapter" }),
    });
    setApproving(false);
    router.refresh();
  }, [book.id, router]);

  const requestChanges = useCallback(async (stepNumber: number, feedback: string, chapterNumber?: number) => {
    await fetch("/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, stepNumber, action: "request_changes", feedback }),
    });
    // Re-run with feedback
    await runAI(stepNumber, chapterNumber, feedback);
  }, [book.id, runAI]);

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

  const step = (n: number) => book.workflowSteps.find((s) => s.stepNumber === n)!;

  const getStepText = (n: number, chNum?: number) => {
    const key = streamKey(n, chNum);
    if (streamText[key]) return streamText[key];
    if (chNum) {
      const ch = book.chapters.find((c) => c.chapterNumber === chNum);
      return ch?.draftText ?? ch?.approvedText ?? "";
    }
    return step(n)?.outputText ?? "";
  };

  // Expected chapter count from size
  const expectedChapters = book.sizeCategory === "FULL" ? 10 :
    book.sizeCategory === "MEDIUM_FULL" ? 8 :
    book.sizeCategory === "MEDIUM" ? 6 : 4;
  const approvedChapters = book.chapters.filter((c) => c.status === "APPROVED").length;
  const allChaptersApproved = approvedChapters >= expectedChapters;

  return (
    <div className="space-y-2">

      {/* ── STEP 1: INTAKE ── */}
      <div>
        <StepHeader number={1} name="Intake" status={step(1).status}
          expanded={expanded === 1} onClick={() => setExpanded(expanded === 1 ? null : 1)} />
        {expanded === 1 && (
          <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
            {step(1).status === "APPROVED" ? (
              <div className="text-sm text-stone-600">
                <p className="text-green-600 font-medium mb-2">✓ {book.transcripts.length} transcript{book.transcripts.length !== 1 ? "s" : ""} saved</p>
                {book.transcripts.map((t) => (
                  <p key={t.id} className="text-xs text-stone-400">· {t.filename}</p>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-stone-600 mb-4">
                  Paste each sermon transcript below. Add more panels for additional sermons.
                </p>
                <div className="space-y-3">
                  {transcriptInputs.map((t, i) => (
                    <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-stone-50 px-3 py-2 border-b border-stone-200">
                        <input
                          value={t.filename}
                          onChange={(e) => setTranscriptInputs((prev) => prev.map((x, j) => j === i ? { ...x, filename: e.target.value } : x))}
                          className="text-xs font-medium text-stone-600 bg-transparent focus:outline-none w-48"
                        />
                        {transcriptInputs.length > 1 && (
                          <button onClick={() => setTranscriptInputs((prev) => prev.filter((_, j) => j !== i))}
                            className="text-xs text-stone-400 hover:text-red-500 transition-colors">Remove</button>
                        )}
                      </div>
                      <textarea
                        value={t.rawText}
                        onChange={(e) => setTranscriptInputs((prev) => prev.map((x, j) => j === i ? { ...x, rawText: e.target.value } : x))}
                        placeholder="Paste transcript text here…"
                        rows={8}
                        className="w-full px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none resize-y"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setTranscriptInputs((prev) => [...prev, { filename: `Transcript ${prev.length + 1}`, rawText: "" }])}
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

      {/* ── STEP 2: ANALYSIS REPORT ── */}
      <div>
        <StepHeader number={2} name="Analysis Report" status={step(2).status}
          expanded={expanded === 2} onClick={() => step(2).status !== "PENDING" && setExpanded(expanded === 2 ? null : 2)} />
        {expanded === 2 && step(2).status !== "PENDING" && (
          <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
            {!getStepText(2) ? (
              <div>
                <p className="text-sm text-stone-500 mb-4">
                  Claude will read all transcripts and produce a full analysis report — central theme, illustrations, content gaps, and chapter mapping.
                </p>
                <button onClick={() => runAI(2)} disabled={streaming}
                  className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
                  {streaming ? "Generating…" : "Run Analysis"}
                </button>
              </div>
            ) : (
              <div>
                <AIOutput text={getStepText(2)} streaming={streaming && expanded === 2} />
                {step(2).status !== "APPROVED" && (
                  <ApproveBar
                    onApprove={() => approve(2)}
                    onRequestChanges={(fb) => requestChanges(2, fb)}
                    approving={approving}
                  />
                )}
                {step(2).status === "APPROVED" && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-green-600 font-medium">✓ Approved</span>
                    <button onClick={() => runAI(2)} disabled={streaming}
                      className="text-xs text-stone-400 hover:text-stone-600">Regenerate</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 3: CHAPTER OUTLINE ── */}
      <div>
        <StepHeader number={3} name="Chapter Outline" status={step(3).status}
          expanded={expanded === 3} onClick={() => step(3).status !== "PENDING" && setExpanded(expanded === 3 ? null : 3)} />
        {expanded === 3 && step(3).status !== "PENDING" && (
          <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
            {!getStepText(3) ? (
              <div>
                <p className="text-sm text-stone-500 mb-4">
                  Claude will propose the full chapter-by-chapter outline based on the approved analysis.
                </p>
                <button onClick={() => runAI(3)} disabled={streaming}
                  className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
                  {streaming ? "Generating…" : "Generate Outline"}
                </button>
              </div>
            ) : (
              <div>
                <AIOutput text={getStepText(3)} streaming={streaming && expanded === 3} />
                {step(3).status !== "APPROVED" && (
                  <ApproveBar
                    onApprove={() => approve(3)}
                    onRequestChanges={(fb) => requestChanges(3, fb)}
                    approving={approving}
                  />
                )}
                {step(3).status === "APPROVED" && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-green-600 font-medium">✓ Approved</span>
                    <button onClick={() => runAI(3)} disabled={streaming}
                      className="text-xs text-stone-400 hover:text-stone-600">Regenerate</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 4: CHAPTER DRAFTS ── */}
      <div>
        <StepHeader number={4} name="Chapter Drafts" status={step(4).status}
          expanded={expanded === 4} onClick={() => step(4).status !== "PENDING" && setExpanded(expanded === 4 ? null : 4)} />
        {expanded === 4 && step(4).status !== "PENDING" && (
          <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-500">
                {approvedChapters}/{expectedChapters} chapters approved
              </p>
              {allChaptersApproved && step(4).status !== "APPROVED" && (
                <button onClick={() => approve(4)}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-500 font-medium transition-colors">
                  ✓ Mark All Drafts Complete
                </button>
              )}
            </div>

            {/* Chapter tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Array.from({ length: expectedChapters }, (_, i) => i + 1).map((n) => {
                const ch = book.chapters.find((c) => c.chapterNumber === n);
                return (
                  <button key={n} onClick={() => setActiveChapter(n)}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                      activeChapter === n
                        ? "bg-stone-800 text-white"
                        : ch?.status === "APPROVED"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : ch?.draftText
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}>
                    Ch {n}
                    {ch?.status === "APPROVED" && " ✓"}
                  </button>
                );
              })}
            </div>

            {/* Active chapter panel */}
            {(() => {
              const ch = book.chapters.find((c) => c.chapterNumber === activeChapter);
              const text = getStepText(4, activeChapter);
              const isStreaming = streaming && streamText[streamKey(4, activeChapter)] !== undefined;

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-stone-700">
                        Chapter {activeChapter}{ch?.title ? `: ${ch.title}` : ""}
                      </p>
                      {ch?.wordCount && (
                        <p className="text-xs text-stone-400 mt-0.5">{ch.wordCount.toLocaleString()} words</p>
                      )}
                    </div>
                    {ch?.status !== "APPROVED" && (
                      <button
                        onClick={() => runAI(4, activeChapter)}
                        disabled={streaming}
                        className="px-3 py-1.5 text-xs bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors"
                      >
                        {streaming && isStreaming ? "Writing…" : text ? "Regenerate" : "Draft Chapter"}
                      </button>
                    )}
                  </div>

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
                      {ch?.status === "APPROVED" && (
                        <p className="text-xs text-green-600 font-medium mt-3">✓ Chapter approved</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-dashed border-stone-300 rounded-lg p-8 text-center">
                      <p className="text-sm text-stone-400">Click &ldquo;Draft Chapter&rdquo; to generate this chapter with Claude.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── STEP 5: FRONT & BACK MATTER ── */}
      <div>
        <StepHeader number={5} name="Front &amp; Back Matter" status={step(5).status}
          expanded={expanded === 5} onClick={() => step(5).status !== "PENDING" && setExpanded(expanded === 5 ? null : 5)} />
        {expanded === 5 && step(5).status !== "PENDING" && (
          <div className="mt-2 bg-white border border-stone-200 rounded-lg p-5">
            {!getStepText(5) ? (
              <div>
                <p className="text-sm text-stone-500 mb-4">
                  Claude will draft the Foreword, Preface, Introduction, Conclusion, Prayer, About the Author, and Ministry page.
                </p>
                <button onClick={() => runAI(5)} disabled={streaming}
                  className="px-4 py-2 text-sm bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-50 font-medium transition-colors">
                  {streaming ? "Generating…" : "Generate Front & Back Matter"}
                </button>
              </div>
            ) : (
              <div>
                <AIOutput text={getStepText(5)} streaming={streaming && expanded === 5} />
                {step(5).status !== "APPROVED" && (
                  <ApproveBar
                    onApprove={() => approve(5)}
                    onRequestChanges={(fb) => requestChanges(5, fb)}
                    approving={approving}
                  />
                )}
                {step(5).status === "APPROVED" && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-sm text-green-700 font-semibold">🎉 Book complete!</p>
                    <p className="text-xs text-green-600 mt-1">All 5 steps approved. Ready for DOCX export.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
