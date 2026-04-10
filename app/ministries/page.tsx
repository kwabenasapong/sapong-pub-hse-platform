"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import AddMinistryModal from "@/components/AddMinistryModal";
import EditMinistryModal from "@/components/EditMinistryModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { deleteMinistry } from "@/lib/actions";

type MinistryRow = {
  id: string; name: string; slug: string; logoUrl?: string | null;
  authorCount: number; programmeCount: number; bookCount: number; completeCount: number;
};

export default function MinistriesPage() {
  const [ministries, setMinistries] = useState<MinistryRow[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<MinistryRow | null>(null);
  const [deleting, setDeleting]   = useState<MinistryRow | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [, startTransition]       = useTransition();

  async function load() {
    const res = await fetch("/api/ministries");
    setMinistries(await res.json());
  }

  useEffect(() => { load(); }, []);

  function handleDelete(m: MinistryRow) {
    setError(null);
    startTransition(async () => {
      try { await deleteMinistry(m.id); setDeleting(null); load(); }
      catch (err) { setDeleting(null); setError(err instanceof Error ? err.message : "Delete failed"); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <PageHeader
        title="Ministries"
        subtitle="All ministry clients on the platform"
        action={
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Ministry
          </Button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Ministry</th>
              <th className="hidden md:table-cell text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Authors</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Programmes</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Books</th>
              <th className="hidden md:table-cell text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Progress</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {ministries.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">No ministries yet.</td></tr>
            )}
            {ministries.map((m) => {
              const pct = m.bookCount > 0 ? Math.round((m.completeCount / m.bookCount) * 100) : 0;
              return (
                <tr key={m.id} className="hover:bg-stone-50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <p className="font-medium text-stone-800">{m.name}</p>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-5 py-4 text-center text-stone-600">{m.authorCount}</td>
                  <td className="px-5 py-4 text-center text-stone-600">{m.programmeCount}</td>
                  <td className="px-5 py-4 text-center text-stone-600">{m.bookCount}</td>
                  <td className="hidden md:table-cell px-5 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-stone-100 rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-stone-400">{m.completeCount}/{m.bookCount} done</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(m)}
                        className="text-xs text-stone-500 hover:text-stone-800 transition-colors">Edit</button>
                      <button onClick={() => setDeleting(m)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                      <Link href={`/ministries/${m.id}`}
                        className="text-xs text-amber-700 hover:text-amber-600 font-medium">View →</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd  && <AddMinistryModal  onClose={() => { setShowAdd(false);  load(); }} />}
      {editing  && <EditMinistryModal ministry={editing} onClose={() => { setEditing(null); load(); }} />}
      {deleting && (
        <ConfirmDeleteDialog
          title={`Delete "${deleting.name}"?`}
          message="This will permanently delete the ministry and all its data. This cannot be undone."
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
