import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookSummary, Genre, CONTENT_LEVEL_LABELS } from '../types';
import BookCard from '../components/BookCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BookGridSkeleton } from '../components/ui/Skeleton';
import { useDebounce } from '../hooks/useDebounce';

export default function HomePage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const [openLibraryQuery, setOpenLibraryQuery] = useState('');

  // Content filters
  const [maxViolence, setMaxViolence] = useState<string>('');
  const [maxLanguage, setMaxLanguage] = useState<string>('');
  const [maxSexual, setMaxSexual] = useState<string>('');
  const [maxSubstance, setMaxSubstance] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(search, 300);

  const fetchBooks = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedGenre) params.genre = selectedGenre;
    if (maxViolence) params.max_violence = maxViolence;
    if (maxLanguage) params.max_language = maxLanguage;
    if (maxSexual) params.max_sexual = maxSexual;
    if (maxSubstance) params.max_substance = maxSubstance;
    try {
      const data = await api.getBooks(params);
      setBooks(data);
    } catch {
      // Errors handled silently for now
    }
    setLoading(false);
  };

  useEffect(() => {
    api.getGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [debouncedSearch, selectedGenre, maxViolence, maxLanguage, maxSexual, maxSubstance]);

  const handleOpenLibrarySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (openLibraryQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(openLibraryQuery.trim())}`);
    }
  };

  // Count active filters
  const activeFilters = [maxViolence, maxLanguage, maxSexual, maxSubstance].filter(Boolean).length;

  const clearFilters = () => {
    setMaxViolence('');
    setMaxLanguage('');
    setMaxSexual('');
    setMaxSubstance('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">The Shelf</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Discover your next great read</p>
        </div>

        {/* Open Library Search Section */}
        <div className="bg-gradient-to-br from-shelf-50 to-shelf-100 dark:from-shelf-900/30 dark:to-shelf-800/30 rounded-xl p-6 mb-8 border border-shelf-200 dark:border-shelf-700 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <svg className="w-6 h-6 text-shelf-600 dark:text-shelf-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Search Open Library</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Search millions of books and import them to your library
              </p>
            </div>
          </div>
          <form onSubmit={handleOpenLibrarySearch} className="flex gap-3">
            <Input
              type="text"
              value={openLibraryQuery}
              onChange={(e) => setOpenLibraryQuery(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="flex-1"
              aria-label="Search Open Library"
            />
            <Button type="submit" variant="primary" className="px-8">
              Search
            </Button>
          </form>
        </div>

        {/* Browse Section Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Browse Library Books</h2>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or author..."
                aria-label="Search books"
              />
            </div>

            {/* Genre Select */}
            <div className="md:w-48">
              <Select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                aria-label="Filter by genre"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Content Filters Toggle */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters || activeFilters > 0 ? 'primary' : 'secondary'}
              className="md:w-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFilters > 0 && !showFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
              {maxViolence && (
                <Badge variant="info" onRemove={() => setMaxViolence('')}>
                  Violence ≤ {CONTENT_LEVEL_LABELS[parseInt(maxViolence)]}
                </Badge>
              )}
              {maxLanguage && (
                <Badge variant="info" onRemove={() => setMaxLanguage('')}>
                  Language ≤ {CONTENT_LEVEL_LABELS[parseInt(maxLanguage)]}
                </Badge>
              )}
              {maxSexual && (
                <Badge variant="info" onRemove={() => setMaxSexual('')}>
                  Sexual ≤ {CONTENT_LEVEL_LABELS[parseInt(maxSexual)]}
                </Badge>
              )}
              {maxSubstance && (
                <Badge variant="info" onRemove={() => setMaxSubstance('')}>
                  Substance ≤ {CONTENT_LEVEL_LABELS[parseInt(maxSubstance)]}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}

          {/* Content Filter Dropdowns */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select
                  label="Max Violence"
                  value={maxViolence}
                  onChange={(e) => setMaxViolence(e.target.value)}
                >
                  <option value="">Any</option>
                  {CONTENT_LEVEL_LABELS.map((lbl, i) => (
                    <option key={i} value={String(i)}>
                      ≤ {lbl}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Max Language"
                  value={maxLanguage}
                  onChange={(e) => setMaxLanguage(e.target.value)}
                >
                  <option value="">Any</option>
                  {CONTENT_LEVEL_LABELS.map((lbl, i) => (
                    <option key={i} value={String(i)}>
                      ≤ {lbl}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Max Sexual Content"
                  value={maxSexual}
                  onChange={(e) => setMaxSexual(e.target.value)}
                >
                  <option value="">Any</option>
                  {CONTENT_LEVEL_LABELS.map((lbl, i) => (
                    <option key={i} value={String(i)}>
                      ≤ {lbl}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Max Substance Use"
                  value={maxSubstance}
                  onChange={(e) => setMaxSubstance(e.target.value)}
                >
                  <option value="">Any</option>
                  {CONTENT_LEVEL_LABELS.map((lbl, i) => (
                    <option key={i} value={String(i)}>
                      ≤ {lbl}
                    </option>
                  ))}
                </Select>
              </div>

              {activeFilters > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Books Grid */}
        {loading ? (
          <BookGridSkeleton count={20} />
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No books found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {books.length} {books.length === 1 ? 'book' : 'books'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
