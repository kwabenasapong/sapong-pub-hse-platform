"use client";
import { useState } from "react";

export default function ExportButton({
  bookId,
  isComplete,
  hasAllMatter,
}: {
  bookId: string;
  isComplete: boolean;
  hasAllMatter: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/export/${bookId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Export failed");
      }
      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "book.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 ${
          isComplete
            ? "bg-stone-800 text-white hover:bg-stone-700"
            : "bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200"
        }`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Building DOCX…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {isComplete ? "Export DOCX" : "Export Draft DOCX"}
          </>
        )}
      </button>
      {!hasAllMatter && !loading && (
        <p className="text-[10px] text-stone-400">Front/back matter not yet generated</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
