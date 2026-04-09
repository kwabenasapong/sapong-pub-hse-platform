"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import AddMinistryModal from "@/components/AddMinistryModal";

type MinistryRow = {
  id: string;
  name: string;
  slug: string;
  authorCount: number;
  programmeCount: number;
  bookCount: number;
  completeCount: number;
};

export default function MinistriesPage() {
  const [ministries, setMinistries] = useState<MinistryRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const res = await fetch("/api/ministries");
    const data = await res.json();
    setMinistries(data);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Ministries"
        subtitle="All ministry clients on the platform"
        action={
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Ministry
          </Button>
        }
      />

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Ministry</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Authors</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Programmes</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Books</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Progress</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {ministries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">
                  No ministries yet. Add your first one.
                </td>
              </tr>
            )}
            {ministries.map((m) => {
              const pct = m.bookCount > 0 ? Math.round((m.completeCount / m.bookCount) * 100) : 0;
              return (
                <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <p className="font-medium text-stone-800">{m.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-stone-600">{m.authorCount}</td>
                  <td className="px-5 py-4 text-center text-stone-600">{m.programmeCount}</td>
                  <td className="px-5 py-4 text-center text-stone-600">{m.bookCount}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-stone-100 rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-stone-400">{m.completeCount}/{m.bookCount} complete</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/ministries/${m.id}`} className="text-xs text-amber-700 hover:text-amber-600 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddMinistryModal onClose={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
