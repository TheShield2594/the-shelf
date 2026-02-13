import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function HomePage() {
  const navigate = useNavigate();
  const [openLibraryQuery, setOpenLibraryQuery] = useState('');

  const handleOpenLibrarySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (openLibraryQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(openLibraryQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">The Shelf</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xl">Discover your next great read</p>
        </div>

        {/* Open Library Search Section */}
        <div className="bg-gradient-to-br from-shelf-50 to-shelf-100 dark:from-shelf-900/30 dark:to-shelf-800/30 rounded-xl p-8 border border-shelf-200 dark:border-shelf-700 shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <svg className="w-7 h-7 text-shelf-600 dark:text-shelf-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Search Open Library</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Search millions of books and import them to your library
              </p>
            </div>
          </div>
          <form onSubmit={handleOpenLibrarySearch} className="flex gap-3 mt-6">
            <Input
              type="text"
              value={openLibraryQuery}
              onChange={(e) => setOpenLibraryQuery(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="flex-1 text-lg"
              aria-label="Search Open Library"
            />
            <Button type="submit" variant="primary" className="px-10 text-lg">
              Search
            </Button>
          </form>
        </div>

        {/* Information Section */}
        <div className="mt-16 grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-shelf-600 dark:text-shelf-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Build Your Library</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Search and import books from Open Library's extensive catalog. Track your reading progress and organize your collection.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-shelf-600 dark:text-shelf-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Track Your Reading</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Organize books by status, rate your favorites, and discover new books based on your preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
