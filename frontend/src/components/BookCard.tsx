import { Link } from 'react-router-dom';
import { BookSummary, CONTENT_LEVEL_LABELS, CONTENT_LEVEL_COLORS } from '../types';
import StarRating from './StarRating';

interface Props {
  book: BookSummary;
}

function ContentBadge({ label, level }: { label: string; level: number }) {
  const rounded = Math.round(level);
  if (rounded === 0) return null;
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${CONTENT_LEVEL_COLORS[rounded]}`}>
      {label}: {CONTENT_LEVEL_LABELS[rounded]}
    </span>
  );
}

export default function BookCard({ book }: Props) {
  return (
    <Link
      to={`/books/${book.id}`}
      className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex flex-col"
    >
      <div className="h-64 bg-gray-200 flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-gray-400 text-center p-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            No Cover
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{book.author}</p>

        {book.avg_rating !== null && (
          <div className="flex items-center mt-2 space-x-1">
            <StarRating rating={book.avg_rating} size="sm" />
            <span className="text-xs text-gray-500">({book.rating_count})</span>
          </div>
        )}

        {book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {book.genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-xs bg-shelf-100 text-shelf-700 px-2 py-0.5 rounded">
                {g.name}
              </span>
            ))}
          </div>
        )}

        {book.content_rating && book.content_rating.count > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <ContentBadge label="V" level={book.content_rating.violence_level} />
            <ContentBadge label="L" level={book.content_rating.language_level} />
            <ContentBadge label="S" level={book.content_rating.sexual_content_level} />
            <ContentBadge label="D" level={book.content_rating.substance_use_level} />
          </div>
        )}
      </div>
    </Link>
  );
}
