import Link from "next/link";
import { StatCard, PageHeader, WorkflowTracker, BookStatusBadge } from "@/components/ui";
import { WorkflowStatus, BookStatus } from "@prisma/client";

// Static mock data — will be replaced with Prisma queries in Phase 3
const STATS = {
  ministries: 1,
  programmes: 1,
  books: 40,
  inProgress: 2,
};

const RECENT_BOOKS = [
  {
    id: "book-24",
    number: 24,
    title: "THE EXCHANGE — What the Cross Cost and What It Bought for You",
    ministry: "Graceway Fountain Ministries",
    status: "IN_PROGRESS" as BookStatus,
    steps: [
      { stepNumber: 1, status: "APPROVED" as WorkflowStatus },
      { stepNumber: 2, status: "IN_PROGRESS" as WorkflowStatus },
      { stepNumber: 3, status: "PENDING" as WorkflowStatus },
      { stepNumber: 4, status: "PENDING" as WorkflowStatus },
      { stepNumber: 5, status: "PENDING" as WorkflowStatus },
    ],
    updatedAt: "2 hours ago",
  },
  {
    id: "book-17",
    number: 17,
    title: "THE X FACTOR — 21 Days to Uncovering What God Hid Inside You",
    ministry: "Graceway Fountain Ministries",
    status: "IN_PROGRESS" as BookStatus,
    steps: [
      { stepNumber: 1, status: "APPROVED" as WorkflowStatus },
      { stepNumber: 2, status: "APPROVED" as WorkflowStatus },
      { stepNumber: 3, status: "APPROVED" as WorkflowStatus },
      { stepNumber: 4, status: "IN_PROGRESS" as WorkflowStatus },
      { stepNumber: 5, status: "PENDING" as WorkflowStatus },
    ],
    updatedAt: "1 day ago",
  },
  {
    id: "book-1",
    number: 1,
    title: "GO — The Believer's Mandate to Reach the Lost",
    ministry: "Graceway Fountain Ministries",
    status: "COMPLETE" as BookStatus,
    steps: Array.from({ length: 5 }, (_, i) => ({ stepNumber: i + 1, status: "APPROVED" as WorkflowStatus })),
    updatedAt: "3 days ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of the Sapong Publishing House platform"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Ministries" value={STATS.ministries} />
        <StatCard label="Programmes" value={STATS.programmes} />
        <StatCard label="Total Books" value={STATS.books} sub="across all programmes" />
        <StatCard label="In Progress" value={STATS.inProgress} sub="books active" />
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
          {RECENT_BOOKS.map((book) => (
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
                  <p className="text-xs text-stone-400 mt-0.5">{book.ministry}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <WorkflowTracker steps={book.steps} />
                <BookStatusBadge status={book.status} />
                <span className="text-xs text-stone-400 w-20 text-right">{book.updatedAt}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
