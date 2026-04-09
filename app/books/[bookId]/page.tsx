import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookById } from "@/lib/queries";
import { BookStatusBadge, TranslationBadge, SizeBadge } from "@/components/ui";
import BookWorkflow from "./BookWorkflow";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({ params }: { params: { bookId: string } }) {
  const book = await getBookById(params.bookId);
  if (!book) notFound();

  const ministryId = book.programme.ministry.id;
  const programmeId = book.programme.id;

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-xs text-stone-400 mb-4">
        <Link href="/ministries" className="hover:text-stone-600">Ministries</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${ministryId}`} className="hover:text-stone-600">
          {book.programme.ministry.name}
        </Link>
        <span className="mx-1.5">›</span>
        <Link href={`/ministries/${ministryId}/programmes/${programmeId}`} className="hover:text-stone-600">
          {book.programme.title}
        </Link>
        <span className="mx-1.5">›</span>
        Book {book.number}
      </p>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-stone-400">Book {book.number}</span>
          <BookStatusBadge status={book.status} />
          <TranslationBadge translation={book.translation} />
          <SizeBadge size={book.sizeCategory} />
        </div>
        <h1 className="text-2xl font-semibold text-stone-800 leading-tight">{book.title}</h1>
        {book.referenceAuthor && (
          <p className="text-sm text-stone-500 mt-1">Reference style: {book.referenceAuthor}</p>
        )}
      </div>

      <BookWorkflow book={book} />
    </div>
  );
}
