import Link from "next/link";
import { StatCard, PageHeader, WorkflowTracker, BookStatusBadge } from "@/components/ui";
import { getDashboardStats, getRecentBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60)          return "just now";
  if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7)   return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Ministries"  value={stats.ministries} />
        <StatCard label="Programmes"  value={stats.programmes} />
        <StatCard label="Total Books" value={stats.books} sub="across all programmes" />
        <StatCard label="In Progress" value={stats.inProgress} sub="books active" />
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Recent Activity
          </h2>
          <Link href="/ministries"
            className="text-xs text-amber-700 hover:text-amber-600 font-medium transition-colors">
            View all ministries →
          </Link>
        </div>

        {recentBooks.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
            <p className="text-sm text-stone-400 mb-2">No active books yet.</p>
            <Link href="/setup"
              className="text-xs text-amber-700 hover:text-amber-600 font-medium">
              Set up your first client →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {recentBooks.map((book) => {
              const b = book as typeof book & { lastActivity: Date };
              return (
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
                      {/* Breadcrumb — ministry › programme */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-stone-400 truncate">
                          {book.programme.ministry.name}
                        </span>
                        <span className="text-stone-300 text-xs">›</span>
                        <Link
                          href={`/ministries/${book.programme.ministryId}/programmes/${book.programme.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-stone-400 hover:text-amber-600 truncate transition-colors"
                        >
                          {book.programme.title}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <WorkflowTracker steps={book.workflowSteps} />
                    <BookStatusBadge status={book.status} />
                    <span className="text-xs text-stone-400 w-16 text-right">
                      {timeAgo(b.lastActivity)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
