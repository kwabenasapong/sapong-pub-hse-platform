import Link from "next/link";
import { PageHeader, Button, Section } from "@/components/ui";

const MINISTRY = {
  id: "graceway-fountain",
  name: "Graceway Fountain Ministries",
  location: "Ghana",
  author: {
    name: "Rev. Dr. Kwame Kusi-Boadum",
    credentials: "DTh, DPA (Hon. Causa), MBA Finance, BSc Maths, CPA, CMP",
    voiceProfile: {
      tone: ["Bold and declarative", "Pastoral and personal", "Direct when necessary"],
      style: "Heavy Scripture anchoring. No hedging. Repetition for emphasis.",
    },
    culturalContext: {
      background: "Former banker · MD, PrecisionWorks Engineering Ltd",
      markers: ["Ghana cedis", "Tema branch", "Walewale, northern Ghana"],
    },
  },
  programmes: [
    {
      id: "graceway-40-book",
      title: "Graceway 40-Book Publishing Programme",
      translation: "KJV / Passion / NLT",
      referenceAuthor: "Oyedepo · Munroe · Adeyemi · Ashimolowo",
      totalBooks: 40,
      complete: 1,
      inProgress: 2,
    },
  ],
};

export default function MinistryDetailPage({ params }: { params: { id: string } }) {
  const m = MINISTRY;
  void params;

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        {m.name}
      </p>

      <PageHeader
        title={m.name}
        subtitle={m.location}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Add Author</Button>
            <Button variant="primary" size="sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Programme
            </Button>
          </div>
        }
      />

      <Section title="Author Profile">
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center text-stone-100 font-semibold text-lg flex-shrink-0">
              K
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">{m.author.name}</p>
              <p className="text-xs text-stone-400 mt-0.5 mb-4">{m.author.credentials}</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Voice Profile</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {m.author.voiceProfile.tone.map((t) => (
                      <span key={t} className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500">{m.author.voiceProfile.style}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Cultural Context</p>
                  <p className="text-xs text-stone-500 mb-1.5">{m.author.culturalContext.background}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.author.culturalContext.markers.map((mk) => (
                      <span key={mk} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{mk}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Publishing Programmes">
        <div className="space-y-3">
          {m.programmes.map((prog) => {
            const pct = Math.round((prog.complete / prog.totalBooks) * 100);
            return (
              <Link
                key={prog.id}
                href={`/ministries/${m.id}/programmes/${prog.id}`}
                className="block bg-white border border-stone-200 rounded-lg p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 group-hover:text-amber-700 transition-colors">{prog.title}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-stone-400">
                      <span>Translation: {prog.translation}</span>
                      <span>Ref: {prog.referenceAuthor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Books</p>
                      <p className="font-semibold text-stone-700">{prog.totalBooks}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Complete</p>
                      <p className="font-semibold text-green-600">{prog.complete}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Active</p>
                      <p className="font-semibold text-blue-600">{prog.inProgress}</p>
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
      </Section>
    </div>
  );
}
