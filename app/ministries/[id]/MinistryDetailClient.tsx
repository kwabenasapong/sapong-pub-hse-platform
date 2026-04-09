"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Section } from "@/components/ui";
import AddAuthorModal from "@/components/AddAuthorModal";
import EditAuthorModal from "@/components/EditAuthorModal";
import AddProgrammeModal from "@/components/AddProgrammeModal";
import EditProgrammeModal from "@/components/EditProgrammeModal";
import EditMinistryModal from "@/components/EditMinistryModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { deleteAuthor, deleteProgramme } from "@/lib/actions";
import { ProgrammeStatus, Translation } from "@prisma/client";

type Author = {
  id: string; name: string; credentials: string | null;
  voiceProfile: unknown; culturalContext: unknown; bioText: string | null;
};
type Programme = {
  id: string; title: string; defaultTranslation: Translation;
  defaultReferenceAuthor: string | null; status: ProgrammeStatus;
  books: Array<{ id: string; status: string }>;
};
type Ministry = {
  id: string; name: string; slug: string; logoUrl?: string | null;
  authors: Author[];
  programmes: Programme[];
};

export default function MinistryDetailClient({ ministry }: { ministry: Ministry }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showAddAuthor,    setShowAddAuthor]    = useState(false);
  const [showAddProg,      setShowAddProg]      = useState(false);
  const [showEditMinistry, setShowEditMinistry] = useState(false);
  const [editingAuthor,    setEditingAuthor]    = useState<Author | null>(null);
  const [deletingAuthor,   setDeletingAuthor]   = useState<Author | null>(null);
  const [editingProg,      setEditingProg]      = useState<Programme | null>(null);
  const [deletingProg,     setDeletingProg]     = useState<Programme | null>(null);
  const [error,            setError]            = useState<string | null>(null);

  function refresh() { router.refresh(); }

  function handleDeleteAuthor(a: Author) {
    setError(null);
    startTransition(async () => {
      try { await deleteAuthor(a.id); setDeletingAuthor(null); refresh(); }
      catch (err) { setDeletingAuthor(null); setError(err instanceof Error ? err.message : "Delete failed"); }
    });
  }

  function handleDeleteProg(p: Programme) {
    setError(null);
    startTransition(async () => {
      try { await deleteProgramme(p.id); setDeletingProg(null); refresh(); }
      catch (err) { setDeletingProg(null); setError(err instanceof Error ? err.message : "Delete failed"); }
    });
  }

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        {ministry.name}
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <PageHeader
        title={ministry.name}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowEditMinistry(true)}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAddAuthor(true)}>Add Author</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddProg(true)}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Programme
            </Button>
          </div>
        }
      />

      {/* Authors */}
      <Section title="Authors">
        {ministry.authors.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-6 text-center text-sm text-stone-400">
            No authors yet.{" "}
            <button className="text-amber-600 hover:underline" onClick={() => setShowAddAuthor(true)}>Add one.</button>
          </div>
        ) : (
          <div className="space-y-3">
            {ministry.authors.map((a) => {
              const voice   = a.voiceProfile   as { tone?: string[]; style?: string }  | null;
              const culture = a.culturalContext as { background?: string; markers?: string[] } | null;
              return (
                <div key={a.id} className="bg-white border border-stone-200 rounded-lg p-5 group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-100 font-semibold flex-shrink-0">
                      {a.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-stone-800">{a.name}</p>
                          {a.credentials && <p className="text-xs text-stone-400 mt-0.5">{a.credentials}</p>}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingAuthor(a)}
                            className="text-xs text-stone-500 hover:text-stone-800 transition-colors">Edit</button>
                          <button onClick={() => setDeletingAuthor(a)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {voice && (
                          <div>
                            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Voice</p>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {voice.tone?.map((t) => (
                                <span key={t} className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                            {voice.style && <p className="text-xs text-stone-500">{voice.style}</p>}
                          </div>
                        )}
                        {culture && (
                          <div>
                            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Cultural Context</p>
                            {culture.background && <p className="text-xs text-stone-500 mb-1.5">{culture.background}</p>}
                            <div className="flex flex-wrap gap-1">
                              {culture.markers?.map((mk) => (
                                <span key={mk} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{mk}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Programmes */}
      <Section title="Publishing Programmes">
        {ministry.programmes.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-6 text-center text-sm text-stone-400">
            No programmes yet.{" "}
            <button className="text-amber-600 hover:underline" onClick={() => setShowAddProg(true)}>Add one.</button>
          </div>
        ) : (
          <div className="space-y-3">
            {ministry.programmes.map((prog) => {
              const total      = prog.books.length;
              const complete   = prog.books.filter((b) => b.status === "COMPLETE").length;
              const inProgress = prog.books.filter((b) => b.status === "IN_PROGRESS").length;
              const pct        = total > 0 ? Math.round((complete / total) * 100) : 0;
              return (
                <div key={prog.id} className="bg-white border border-stone-200 rounded-lg p-5 group hover:border-stone-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <Link href={`/ministries/${ministry.id}/programmes/${prog.id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 hover:text-amber-700 transition-colors">{prog.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-400">
                        <span>{prog.defaultTranslation}</span>
                        {prog.defaultReferenceAuthor && <span>{prog.defaultReferenceAuthor}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          prog.status === "ACTIVE"    ? "bg-green-50 text-green-700" :
                          prog.status === "PAUSED"    ? "bg-amber-50 text-amber-700" :
                          "bg-stone-100 text-stone-500"}`}>{prog.status}</span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-5 ml-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-stone-400">Books</p>
                        <p className="font-semibold text-stone-700">{total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-400">Done</p>
                        <p className="font-semibold text-green-600">{complete}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-400">Active</p>
                        <p className="font-semibold text-blue-600">{inProgress}</p>
                      </div>
                      <div className="w-20">
                        <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                          <span>Progress</span><span>{pct}%</span>
                        </div>
                        <div className="bg-stone-100 rounded-full h-1.5">
                          <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingProg(prog)}
                          className="text-xs text-stone-500 hover:text-stone-800 transition-colors">Edit</button>
                        <button onClick={() => setDeletingProg(prog)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Modals */}
      {showEditMinistry && (
        <EditMinistryModal ministry={ministry} onClose={() => { setShowEditMinistry(false); refresh(); }} />
      )}
      {showAddAuthor && (
        <AddAuthorModal ministryId={ministry.id} onClose={() => { setShowAddAuthor(false); refresh(); }} />
      )}
      {editingAuthor && (
        <EditAuthorModal author={editingAuthor} onClose={() => { setEditingAuthor(null); refresh(); }} />
      )}
      {deletingAuthor && (
        <ConfirmDeleteDialog
          title={`Delete "${deletingAuthor.name}"?`}
          message="This will permanently delete the author. Cannot delete if they have active or completed books."
          onConfirm={() => handleDeleteAuthor(deletingAuthor)}
          onCancel={() => setDeletingAuthor(null)}
        />
      )}
      {showAddProg && ministry.authors.length > 0 && (
        <AddProgrammeModal
          ministryId={ministry.id}
          authors={ministry.authors.map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => { setShowAddProg(false); refresh(); }}
        />
      )}
      {editingProg && (
        <EditProgrammeModal programme={editingProg} onClose={() => { setEditingProg(null); refresh(); }} />
      )}
      {deletingProg && (
        <ConfirmDeleteDialog
          title={`Delete "${deletingProg.title}"?`}
          message="This will permanently delete the programme and all its books. Cannot delete if any books are active or complete."
          onConfirm={() => handleDeleteProg(deletingProg)}
          onCancel={() => setDeletingProg(null)}
        />
      )}
    </div>
  );
}
