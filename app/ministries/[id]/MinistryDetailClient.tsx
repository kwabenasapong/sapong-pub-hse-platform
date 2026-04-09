"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Section } from "@/components/ui";
import AddAuthorModal from "@/components/AddAuthorModal";
import AddProgrammeModal from "@/components/AddProgrammeModal";

type Props = {
  ministry: {
    id: string;
    name: string;
    authors: Array<{ id: string; name: string; credentials: string | null; voiceProfile: unknown; culturalContext: unknown }>;
    programmes: Array<{
      id: string;
      title: string;
      defaultTranslation: string;
      defaultReferenceAuthor: string | null;
      books: Array<{ id: string; status: string }>;
    }>;
  };
};

export default function MinistryDetailClient({ ministry }: Props) {
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showProgrammeModal, setShowProgrammeModal] = useState(false);
  const router = useRouter();

  function refresh() { router.refresh(); }

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        {ministry.name}
      </p>

      <PageHeader
        title={ministry.name}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAuthorModal(true)}>
              Add Author
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowProgrammeModal(true)}>
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
            <button className="text-amber-600 hover:underline" onClick={() => setShowAuthorModal(true)}>
              Add one.
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ministry.authors.map((a) => {
              const voice = a.voiceProfile as { tone?: string[]; style?: string } | null;
              const culture = a.culturalContext as { background?: string; markers?: string[] } | null;
              return (
                <div key={a.id} className="bg-white border border-stone-200 rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-100 font-semibold flex-shrink-0">
                      {a.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800">{a.name}</p>
                      {a.credentials && <p className="text-xs text-stone-400 mt-0.5 mb-3">{a.credentials}</p>}
                      <div className="grid grid-cols-2 gap-4">
                        {voice && (
                          <div>
                            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Voice</p>
                            <div className="flex flex-wrap gap-1">
                              {voice.tone?.map((t) => (
                                <span key={t} className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                            {voice.style && <p className="text-xs text-stone-500 mt-1.5">{voice.style}</p>}
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
            <button className="text-amber-600 hover:underline" onClick={() => setShowProgrammeModal(true)}>
              Add one.
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ministry.programmes.map((prog) => {
              const total = prog.books.length;
              const complete = prog.books.filter((b) => b.status === "COMPLETE").length;
              const inProgress = prog.books.filter((b) => b.status === "IN_PROGRESS").length;
              const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
              return (
                <Link
                  key={prog.id}
                  href={`/ministries/${ministry.id}/programmes/${prog.id}`}
                  className="block bg-white border border-stone-200 rounded-lg p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 group-hover:text-amber-700 transition-colors">{prog.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-400">
                        <span>Translation: {prog.defaultTranslation}</span>
                        {prog.defaultReferenceAuthor && <span>Ref: {prog.defaultReferenceAuthor}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 ml-6 flex-shrink-0">
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
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                          <span>Progress</span><span>{pct}%</span>
                        </div>
                        <div className="bg-stone-100 rounded-full h-1.5">
                          <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {showAuthorModal && (
        <AddAuthorModal
          ministryId={ministry.id}
          onClose={() => { setShowAuthorModal(false); refresh(); }}
        />
      )}
      {showProgrammeModal && ministry.authors.length > 0 && (
        <AddProgrammeModal
          ministryId={ministry.id}
          authors={ministry.authors.map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => { setShowProgrammeModal(false); refresh(); }}
        />
      )}
      {showProgrammeModal && ministry.authors.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
            <p className="text-sm text-stone-600 mb-4">Add an author first before creating a programme.</p>
            <Button variant="primary" onClick={() => { setShowProgrammeModal(false); setShowAuthorModal(true); }}>
              Add Author
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
