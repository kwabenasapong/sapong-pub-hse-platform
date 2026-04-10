import Link from "next/link";
import { StatCard, PageHeader } from "@/components/ui";
import { getDashboardStats, getRecentBooks } from "@/lib/queries";
import RecentActivityList from "@/components/RecentActivityList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, recentBooks] = await Promise.all([
    getDashboardStats(),
    getRecentBooks(8),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of the Sapong Publishing House platform"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
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
          <RecentActivityList books={recentBooks} />
        )}
      </div>
    </div>
  );
}
