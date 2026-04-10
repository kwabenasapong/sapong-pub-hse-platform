"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────
type ConfigEntry = { value: string; source: "db" | "env" | "default" };
type Config = Record<string, ConfigEntry>;

type UsageSummary = { totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number; logCount: number };
type BookUsage = { bookId: string; bookTitle: string; inputTokens: number; outputTokens: number; costUsd: number; byStep: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }> };
type AuthorUsage = { authorId: string; authorName: string; inputTokens: number; outputTokens: number; costUsd: number; byBook: BookUsage[] };
type MinistryUsage = { ministryId: string; ministryName: string; inputTokens: number; outputTokens: number; costUsd: number; byAuthor: AuthorUsage[] };

type RefAuthor = { id: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtUsd(n: number)  { return "$" + n.toFixed(4); }
function fmtGhs(n: number, rate: number) { return "GHS " + (n * rate).toFixed(2); }

const SOURCE_BADGE: Record<string, string> = {
  db:      "bg-blue-50 text-blue-700 border border-blue-200",
  env:     "bg-stone-100 text-stone-500 border border-stone-200",
  default: "bg-stone-50 text-stone-400 border border-stone-200",
};

const STEP_LABELS: Record<string, string> = {
  analysis:          "Analysis Report",
  outline:           "Chapter Outline",
  chapter_draft:     "Chapter Draft",
  front_back_matter: "Front & Back Matter",
  voice_deduction:   "Voice Deduction",
};

// ── Tab: Platform Config ──────────────────────────────────────────────────────
function PlatformTab() {
  const [config, setConfig]   = useState<Config | null>(null);
  const [saving, setSaving]   = useState<string | null>(null);
  const [saved,  setSaved]    = useState<string | null>(null);
  const [edits,  setEdits]    = useState<Record<string, string>>({});
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  async function loadConfig() {
    const res = await fetch("/api/settings/config");
    setConfig(await res.json());
  }

  useEffect(() => { loadConfig(); }, []);

  async function save(key: string) {
    const value = edits[key];
    if (value === undefined) return;
    setSaving(key);
    await fetch("/api/settings/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
    setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    await loadConfig();
  }

  async function revert(key: string) {
    await fetch("/api/settings/config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    await loadConfig();
  }

  async function purgeOldLogs() {
    const months = config?.usageLogRetention?.value ?? "12";
    setPurging(true);
    const res = await fetch("/api/settings/usage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: parseInt(months) }),
    });
    const data = await res.json();
    setPurging(false);
    setPurgeMsg(`Deleted ${data.deleted ?? 0} log entries older than ${months} months.`);
    setTimeout(() => setPurgeMsg(null), 4000);
  }

  if (!config) return <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>;

  function field(
    key: string,
    label: string,
    type: "text" | "password" | "select" | "number" = "text",
    options?: string[]
  ) {
    const current = config![key];
    const editVal = edits[key];
    const displayVal = editVal !== undefined ? editVal : (key === "anthropicApiKey" ? current?.value : current?.value) ?? "";
    const isDirty = editVal !== undefined;

    return (
      <div className="flex items-start justify-between py-3 border-b border-stone-100 last:border-0">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-stone-700">{label}</p>
            {current && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_BADGE[current.source]}`}>
                {current.source === "db" ? "DB override" : current.source === "env" ? "ENV" : "default"}
              </span>
            )}
          </div>
          {type === "select" && options ? (
            <select
              value={displayVal}
              onChange={(e) => setEdits((ed) => ({ ...ed, [key]: e.target.value }))}
              className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
            >
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={displayVal}
              placeholder={key === "anthropicApiKey" ? "sk-ant-…" : ""}
              onChange={(e) => setEdits((ed) => ({ ...ed, [key]: e.target.value }))}
              className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 w-72"
            />
          )}
        </div>
        <div className="flex items-center gap-2 mt-5">
          {isDirty && (
            <button onClick={() => save(key)} disabled={saving === key}
              className="px-3 py-1.5 text-xs bg-amber-500 text-stone-900 rounded hover:bg-amber-400 font-medium transition-colors disabled:opacity-50">
              {saving === key ? "Saving…" : saved === key ? "✓ Saved" : "Save"}
            </button>
          )}
          {!isDirty && saved === key && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {current?.source === "db" && !isDirty && (
            <button onClick={() => revert(key)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              Revert to default
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API & Model */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Anthropic API</p>
        </div>
        <div className="px-5">
          {field("anthropicApiKey", "API Key", "password")}
          {field("anthropicModel", "Model", "select", ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"])}
        </div>
      </div>

      {/* Export */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">DOCX Export Defaults</p>
        </div>
        <div className="px-5">
          {field("exportFont", "Font", "select", ["Georgia", "Times New Roman", "Calibri"])}
          {field("exportPageSize", "Page Size", "select", ["letter", "a4"])}
        </div>
      </div>

      {/* Cost display */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Currency & Cost Display</p>
        </div>
        <div className="px-5">
          {field("exchangeRateGHS", "GHS / USD Exchange Rate", "number")}
        </div>
      </div>

      {/* Usage log retention */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Usage Log Retention</p>
        </div>
        <div className="px-5">
          {field("usageLogRetention", "Retain logs for (months)", "number")}
          <div className="py-3">
            <button onClick={purgeOldLogs} disabled={purging}
              className="px-4 py-2 text-sm bg-stone-100 text-stone-700 border border-stone-200 rounded hover:bg-stone-200 disabled:opacity-50 transition-colors">
              {purging ? "Purging…" : "Purge logs now"}
            </button>
            {purgeMsg && <p className="text-xs text-stone-500 mt-2">{purgeMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: AI Usage ─────────────────────────────────────────────────────────────
function UsageTab() {
  const [data,       setData]       = useState<{ summary: UsageSummary; byMinistry: MinistryUsage[] } | null>(null);
  const [period,     setPeriod]     = useState("month");
  const [currency,   setCurrency]   = useState<"usd" | "ghs">("usd");
  const [rate,       setRate]       = useState(15.5);
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const [stepType,   setStepType]   = useState("");

  const load = useCallback(async () => {
    setData(null);
    const params = new URLSearchParams({ period });
    if (stepType) params.set("stepType", stepType);
    const res = await fetch("/api/settings/usage?" + params);
    const json = await res.json();
    setData(json);
    // Load exchange rate from config
    const cfgRes = await fetch("/api/settings/config");
    const cfg = await cfgRes.json();
    if (cfg.exchangeRateGHS?.value) setRate(parseFloat(cfg.exchangeRateGHS.value));
  }, [period, stepType]);

  useEffect(() => { load(); }, [load]);

  function fmt(usd: number) {
    return currency === "usd" ? fmtUsd(usd) : fmtGhs(usd, rate);
  }

  function toggle(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  if (!data) return <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>;

  const { summary, byMinistry } = data;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-stone-200 overflow-hidden">
          {(["week", "month", "year", "all"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}>
              {p === "all" ? "All time" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <select value={stepType} onChange={(e) => setStepType(e.target.value)}
          className="border border-stone-200 rounded px-3 py-1.5 text-xs bg-white text-stone-700 focus:outline-none">
          <option value="">All steps</option>
          {Object.entries(STEP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden ml-auto">
          {(["usd", "ghs"] as const).map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${currency === c ? "bg-amber-500 text-stone-900" : "bg-white text-stone-500 hover:bg-stone-50"}`}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Cost",      value: fmt(summary.totalCostUsd) },
          { label: "AI Calls",        value: summary.logCount.toLocaleString() },
          { label: "Input Tokens",    value: fmtTokens(summary.totalInputTokens) },
          { label: "Output Tokens",   value: fmtTokens(summary.totalOutputTokens) },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-stone-200 rounded-lg p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-xl font-semibold text-stone-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Per-ministry breakdown */}
      {byMinistry.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-sm text-stone-400">
          No AI usage logged yet. Usage is recorded when workflow steps are run.
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Ministry / Author / Book</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Input</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Output</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {byMinistry.map((m) => (
                <>
                  {/* Ministry row */}
                  <tr key={m.ministryId} className="bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => toggle(`m_${m.ministryId}`)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 text-xs">{expanded[`m_${m.ministryId}`] ? "▼" : "▶"}</span>
                        <span className="font-semibold text-stone-800 text-sm">{m.ministryName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-stone-500">{fmtTokens(m.inputTokens)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-stone-500">{fmtTokens(m.outputTokens)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-stone-700">{fmt(m.costUsd)}</td>
                  </tr>
                  {/* Author rows */}
                  {expanded[`m_${m.ministryId}`] && m.byAuthor.map((a) => (
                    <>
                      <tr key={a.authorId} className="cursor-pointer hover:bg-stone-50 transition-colors"
                        onClick={() => toggle(`a_${a.authorId}`)}>
                        <td className="px-4 py-2 pl-10">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-300 text-xs">{expanded[`a_${a.authorId}`] ? "▼" : "▶"}</span>
                            <span className="text-stone-700">{a.authorName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-stone-400">{fmtTokens(a.inputTokens)}</td>
                        <td className="px-4 py-2 text-right text-xs text-stone-400">{fmtTokens(a.outputTokens)}</td>
                        <td className="px-4 py-2 text-right text-sm text-stone-600 font-medium">{fmt(a.costUsd)}</td>
                      </tr>
                      {/* Book rows */}
                      {expanded[`a_${a.authorId}`] && a.byBook.map((b) => (
                        <>
                          <tr key={b.bookId} className="cursor-pointer hover:bg-stone-50"
                            onClick={() => toggle(`b_${b.bookId}`)}>
                            <td className="px-4 py-1.5 pl-16 text-xs text-stone-600">
                              <span className="text-stone-300 mr-1">{expanded[`b_${b.bookId}`] ? "▼" : "▶"}</span>
                              {b.bookTitle}
                            </td>
                            <td className="px-4 py-1.5 text-right text-xs text-stone-400">{fmtTokens(b.inputTokens)}</td>
                            <td className="px-4 py-1.5 text-right text-xs text-stone-400">{fmtTokens(b.outputTokens)}</td>
                            <td className="px-4 py-1.5 text-right text-xs text-stone-500">{fmt(b.costUsd)}</td>
                          </tr>
                          {/* Step rows */}
                          {expanded[`b_${b.bookId}`] && Object.entries(b.byStep).map(([st, sv]) => (
                            <tr key={st} className="bg-stone-50/50">
                              <td className="px-4 py-1 pl-20 text-xs text-stone-400">
                                {STEP_LABELS[st] ?? st}
                              </td>
                              <td className="px-4 py-1 text-right text-xs text-stone-300">{fmtTokens(sv.inputTokens)}</td>
                              <td className="px-4 py-1 text-right text-xs text-stone-300">{fmtTokens(sv.outputTokens)}</td>
                              <td className="px-4 py-1 text-right text-xs text-stone-400">{fmt(sv.costUsd)}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Reference Data ───────────────────────────────────────────────────────
function ReferenceDataTab() {
  const [authors,   setAuthors]   = useState<RefAuthor[]>([]);
  const [newName,   setNewName]   = useState("");
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editName,  setEditName]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/refauthors");
    setAuthors(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) return;
    setSaving(true); setError(null);
    const res = await fetch("/api/settings/refauthors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else { setNewName(""); await load(); }
    setSaving(false);
  }

  async function update(id: string) {
    setSaving(true); setError(null);
    await fetch("/api/settings/refauthors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName.trim() }),
    });
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch("/api/settings/refauthors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error} <button onClick={() => setError(null)} className="ml-2 text-red-400">✕</button>
        </div>
      )}

      {/* Reference authors */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Reference Authors</p>
          <p className="text-xs text-stone-400">Used as style calibration in book forms and the setup wizard</p>
        </div>
        <div className="divide-y divide-stone-100">
          {authors.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 group">
              {editId === a.id ? (
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") update(a.id); if (e.key === "Escape") setEditId(null); }}
                  className="border border-amber-400 rounded px-2 py-1 text-sm flex-1 mr-4 focus:outline-none" />
              ) : (
                <span className="text-sm text-stone-700">{a.name}</span>
              )}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {editId === a.id ? (
                  <>
                    <button onClick={() => update(a.id)} disabled={saving}
                      className="text-xs text-green-600 hover:text-green-800 font-medium">Save</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(a.id); setEditName(a.name); }}
                      className="text-xs text-stone-500 hover:text-stone-800">Edit</button>
                    <button onClick={() => remove(a.id)}
                      className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {/* Add new */}
          <div className="flex items-center gap-2 px-5 py-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="Add reference author…"
              className="flex-1 border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <button onClick={add} disabled={saving || !newName.trim()}
              className="px-4 py-1.5 text-xs bg-amber-500 text-stone-900 rounded hover:bg-amber-400 disabled:opacity-40 font-medium transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Translations — read only */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Bible Translations</p>
          <p className="text-xs text-stone-400">Enum values — changing requires a schema migration</p>
        </div>
        <div className="divide-y divide-stone-100">
          {["KJV — King James Version", "PASSION — The Passion Translation", "NLT — New Living Translation"].map((t) => (
            <div key={t} className="px-5 py-3 text-sm text-stone-500">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main settings page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<"platform" | "usage" | "reference">("platform");

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Settings" subtitle="Platform configuration and AI usage" />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          { id: "platform",  label: "Platform" },
          { id: "usage",     label: "AI Usage & Costs" },
          { id: "reference", label: "Reference Data" },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id
                ? "border-amber-500 text-stone-800"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "platform"  && <PlatformTab />}
      {tab === "usage"     && <UsageTab />}
      {tab === "reference" && <ReferenceDataTab />}
    </div>
  );
}
