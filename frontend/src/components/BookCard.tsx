import { Link } from 'react-router-dom';
import { BookSummary, CONTENT_LEVEL_LABELS, CONTENT_LEVEL_COLORS } from '../types';
import StarRating from './StarRating';
import { Badge } from './ui/Badge';

interface Props {
  book: BookSummary;
  showQuickActions?: boolean;
}

function ContentBadge({ label, level }: { label: string; level: number }) {
  const rounded = Math.round(level);
  if (rounded === 0) return null;

  const variantMap = {
    1: 'success' as const,
    2: 'warning' as const,
    3: 'danger' as const,
    4: 'danger' as const,
  };

  return (
    <Badge variant={variantMap[rounded as keyof typeof variantMap]} size="sm">
      {label}: {CONTENT_LEVEL_LABELS[rounded]}
    </Badge>
  );
}

export default function BookCard({ book, showQuickActions = false }: Props) {
  return (
    <div className="group relative">
      <Link
        to={`/books/${book.id}`}
        className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700"
      >
        {/* Cover Image Container */}
        <div className="relative h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title} by ${book.author}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              loading="lazy"
            />
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-center p-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-sm">No Cover</span>
            </div>
          )}

          {/* Hover Overlay with Quick Actions */}
          {showQuickActions && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-full bg-white/95 hover:bg-white text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors shadow-lg text-sm"
                aria-label={`Quick view ${book.title}`}
              >
                Quick View
              </button>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="p-3 flex-1 flex flex-col space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{book.author}</p>

          {/* Rating */}
          {book.avg_rating !== null && (
            <div className="flex items-center space-x-1.5">
              <StarRating rating={book.avg_rating} size="sm" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({book.rating_count})
              </span>
            </div>
          )}

          {/* Genres */}
          {book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {book.genres.slice(0, 2).map((g) => (
                <Badge key={g.id} variant="default" size="sm">
                  {g.name}
                </Badge>
              ))}
              {book.genres.length > 2 && (
                <Badge variant="default" size="sm">
                  +{book.genres.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Content Rating Badges */}
          {book.content_rating && book.content_rating.count > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              <ContentBadge label="V" level={book.content_rating.violence_level} />
              <ContentBadge label="L" level={book.content_rating.language_level} />
              <ContentBadge label="S" level={book.content_rating.sexual_content_level} />
              <ContentBadge label="D" level={book.content_rating.substance_use_level} />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
