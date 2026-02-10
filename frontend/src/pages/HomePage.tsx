import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { BookSummary, Genre, CONTENT_LEVEL_LABELS } from '../types';
import BookCard from '../components/BookCard';
import { BookCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function HomePage() {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(true);

  // Content filters
  const [maxViolence, setMaxViolence] = useState<string>('');
  const [maxLanguage, setMaxLanguage] = useState<string>('');
  const [maxSexual, setMaxSexual] = useState<string>('');
  const [maxSubstance, setMaxSubstance] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = maxViolence || maxLanguage || maxSexual || maxSubstance;

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (selectedGenre) params.genre = selectedGenre;
    if (maxViolence) params.max_violence = maxViolence;
    if (maxLanguage) params.max_language = maxLanguage;
    if (maxSexual) params.max_sexual = maxSexual;
    if (maxSubstance) params.max_substance = maxSubstance;
    try {
      const data = await api.getBooks(params);
      setBooks(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [search, selectedGenre, maxViolence, maxLanguage, maxSexual, maxSubstance]);

  useEffect(() => {
    api.getGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timeout);
  }, [fetchBooks]);

  const clearFilters = () => {
    setMaxViolence('');
    setMaxLanguage('');
    setMaxSexual('');
    setMaxSubstance('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Discover Books
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Find your next great read</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 mb-6">
        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or author..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-11 pr-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-shelf-400 focus:border-shelf-400 outline-none transition"
            aria-label="Search books"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-shelf-400 outline-none"
            aria-label="Filter by genre"
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
              showFilters || hasActiveFilters
                ? 'bg-shelf-50 dark:bg-shelf-900/30 border-shelf-300 dark:border-shelf-700 text-shelf-700 dark:text-shelf-400'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            aria-expanded={showFilters}
            aria-controls="content-filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Content Filters
            {hasActiveFilters && (
              <span className="bg-shelf-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-2 transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content filter panel */}
        {showFilters && (
          <div
            id="content-filters"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in"
          >
            <ContentFilterSelect label="Max Violence" value={maxViolence} onChange={setMaxViolence} />
            <ContentFilterSelect label="Max Language" value={maxLanguage} onChange={setMaxLanguage} />
            <ContentFilterSelect label="Max Sexual Content" value={maxSexual} onChange={setMaxSexual} />
            <ContentFilterSelect label="Max Substance Use" value={maxSubstance} onChange={setMaxSubstance} />
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="No books found"
          description={search ? `No results for "${search}". Try a different search term.` : 'No books match your current filters.'}
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentFilterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-shelf-400 outline-none"
      >
        <option value="">Any</option>
        {CONTENT_LEVEL_LABELS.map((lbl, i) => (
          <option key={i} value={String(i)}>
            &le; {lbl}
          </option>
        ))}
      </select>
    </div>
  );
}
