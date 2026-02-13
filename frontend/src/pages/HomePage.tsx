import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookSummary, Genre, CONTENT_LEVEL_LABELS } from '../types';
import BookCard from '../components/BookCard';

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

  const fetchBooks = async () => {
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
  };

  useEffect(() => {
    api.getGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timeout);
  }, [search, selectedGenre, maxViolence, maxLanguage, maxSexual, maxSubstance]);

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
        <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Any</option>
          {CONTENT_LEVEL_LABELS.map((lbl, i) => (
            <option key={i} value={String(i)}>
              ≤ {lbl}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const handleOpenLibrarySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (openLibraryQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(openLibraryQuery.trim())}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">The Shelf</h1>
        <p className="text-gray-600">Discover your next great read</p>
      </div>

      {/* Open Library Search */}
      <div className="bg-gradient-to-br from-shelf-50 to-shelf-100 rounded-xl p-6 mb-8 border border-shelf-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Search Open Library</h2>
        <p className="text-gray-600 text-sm mb-4">
          Search millions of books and import them to your library
        </p>
        <form onSubmit={handleOpenLibrarySearch} className="flex gap-2">
          <input
            type="text"
            value={openLibraryQuery}
            onChange={(e) => setOpenLibraryQuery(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-shelf-400 focus:border-shelf-400 outline-none"
          />
          <button
            type="submit"
            className="bg-shelf-500 text-white px-6 py-2.5 rounded-lg hover:bg-shelf-600 transition font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Browse Library Books */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse Library Books</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or author..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-shelf-400 focus:border-shelf-400 outline-none"
          />
        </div>
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.name}>{g.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-lg border transition ${
            showFilters ? 'bg-shelf-100 border-shelf-400 text-shelf-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Content Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <ContentFilterSelect label="Max Violence" value={maxViolence} onChange={setMaxViolence} />
          <ContentFilterSelect label="Max Language" value={maxLanguage} onChange={setMaxLanguage} />
          <ContentFilterSelect label="Max Sexual Content" value={maxSexual} onChange={setMaxSexual} />
          <ContentFilterSelect label="Max Substance Use" value={maxSubstance} onChange={setMaxSubstance} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading books...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No books found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
