import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";

const MINISTRIES = [
  {
    id: "graceway-fountain",
    name: "Graceway Fountain Ministries",
    location: "Ghana",
    programmes: 1,
    books: 40,
    booksComplete: 1,
    booksInProgress: 2,
    author: "Rev. Dr. Kwame Kusi-Boadum",
  },
];

export default function MinistriesPage() {
  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Ministries"
        subtitle="All ministry clients on the platform"
        action={
          <Button variant="primary" size="sm">
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
              <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Author</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Programmes</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Books</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Progress</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {MINISTRIES.map((m) => (
              <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">{m.name}</p>
                      <p className="text-xs text-stone-400">{m.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-stone-600 text-xs">{m.author}</td>
                <td className="px-5 py-4 text-center text-stone-600">{m.programmes}</td>
                <td className="px-5 py-4 text-center text-stone-600">{m.books}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-full bg-stone-100 rounded-full h-1.5 max-w-[80px]">
                      <div
                        className="bg-green-400 h-1.5 rounded-full"
                        style={{ width: `${(m.booksComplete / m.books) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400">{m.booksComplete}/{m.books} complete</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/ministries/${m.id}`}
                    className="text-xs text-amber-700 hover:text-amber-600 font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
