import Link from "next/link";
import { StatCard, PageHeader, WorkflowTracker, BookStatusBadge } from "@/components/ui";
import { getDashboardStats, getRecentBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, recentBooks] = await Promise.all([
    getDashboardStats(),
    getRecentBooks(8),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of the Sapong Publishing House platform"
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Ministries"  value={stats.ministries} />
        <StatCard label="Programmes"  value={stats.programmes} />
        <StatCard label="Total Books" value={stats.books} sub="across all programmes" />
        <StatCard label="In Progress" value={stats.inProgress} sub="books active" />
      </div>

      <div>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
          Recent Books
        </h2>
        {recentBooks.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-sm text-stone-400">
            No books yet. Add a ministry and programme to get started.
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {recentBooks.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-xs text-stone-400 font-mono w-6 text-right flex-shrink-0">
                    {book.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate group-hover:text-amber-700 transition-colors">
                      {book.title}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {book.programme.ministry.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <WorkflowTracker steps={book.workflowSteps} />
                  <BookStatusBadge status={book.status} />
                  <span className="text-xs text-stone-400 w-28 text-right">
                    {new Date(book.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
