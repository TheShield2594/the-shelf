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
      className="group bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-lg dark:shadow-gray-950/50 transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1"
    >
      <div className="relative h-64 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm">No Cover</span>
          </div>
        )}
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <span className="text-white text-sm font-medium">View Details</span>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.author}</p>

        {book.avg_rating !== null && (
          <div className="flex items-center mt-2 gap-1">
            <StarRating rating={book.avg_rating} size="sm" />
            <span className="text-xs text-gray-400 dark:text-gray-500">({book.rating_count})</span>
          </div>
        )}

        {book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {book.genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-xs bg-shelf-50 dark:bg-shelf-900/30 text-shelf-700 dark:text-shelf-400 px-2 py-0.5 rounded-full">
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
