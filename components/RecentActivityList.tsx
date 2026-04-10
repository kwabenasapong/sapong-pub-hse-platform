"use client";
import Link from "next/link";
import { WorkflowTracker, BookStatusBadge } from "@/components/ui";
import { BookStatus, WorkflowStatus } from "@prisma/client";

type RecentBook = {
  id: string;
  number: number;
  title: string;
  status: BookStatus;
  lastActivity: Date | string;
  programme: {
    id: string;
    title: string;
    ministryId: string;
    ministry: { name: string };
  };
  workflowSteps: Array<{ stepNumber: number; status: WorkflowStatus }>;
};

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60)        return "just now";
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function RecentActivityList({ books }: { books: RecentBook[] }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
      {books.map((book) => (
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
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0 ml-4">
            <WorkflowTracker steps={book.workflowSteps} />
            <BookStatusBadge status={book.status} />
            <span className="text-xs text-stone-400 w-16 text-right">
              {timeAgo(book.lastActivity)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
