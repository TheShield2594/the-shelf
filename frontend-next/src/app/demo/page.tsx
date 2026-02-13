'use client';

import { useState } from 'react';
import { BookFingerprint } from '@/components/BookFingerprint';
import { MultiDimensionalRatingForm } from '@/components/MultiDimensionalRatingForm';
import type { MultiDimensionalRating } from '@/types';

export default function DemoPage() {
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  // Mock book data for demo
  const mockBook = {
    id: 1,
    title: 'The Night Circus',
    author: 'Erin Morgenstern',
    cover_url: 'https://covers.openlibrary.org/b/id/7884747-L.jpg',
  };

  // Mock fingerprint data
  const mockFingerprint = {
    book_id: 1,
    avg_pace: 3.2,
    avg_emotional_impact: 4.5,
    avg_complexity: 3.0,
    avg_character_development: 4.1,
    avg_plot_quality: 3.8,
    avg_prose_style: 4.7,
    avg_originality: 4.3,
    star_equivalent: 3.9,
    total_ratings: 234,
    has_ratings: true,
    updated_at: new Date().toISOString(),
  };

  const handleRatingSuccess = (rating: MultiDimensionalRating) => {
    setHasRated(true);
    setShowRatingForm(false);
    // In a real app, refresh the fingerprint
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-shelf-50 to-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Demo Banner */}
        <div className="bg-blue-600 text-white rounded-lg px-6 py-4 mb-8 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">ℹ️</span>
            <div>
              <h2 className="font-bold text-lg">Interactive Demo</h2>
              <p className="text-sm text-blue-100">
                This is a demo of the multi-dimensional rating system. Try rating a book!
              </p>
            </div>
          </div>
        </div>

        {/* Book Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <img
                src={mockBook.cover_url}
                alt={mockBook.title}
                className="w-full rounded-lg shadow-md"
              />
            </div>
            <div className="md:col-span-2">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">
                {mockBook.title}
              </h1>
              <p className="text-xl text-gray-600 mb-6">by {mockBook.author}</p>

              <p className="text-gray-700 mb-6 leading-relaxed">
                A mesmerizing tale of two young illusionists pitted against each other
                in a magical competition. Set in a mysterious circus that arrives
                without warning, this enchanting novel weaves romance, magic, and
                wonder into an unforgettable story.
              </p>

              <button
                onClick={() => setShowRatingForm(!showRatingForm)}
                className="bg-shelf-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-shelf-700 transition-all shadow-md hover:shadow-lg"
              >
                {hasRated ? '✏️ Edit Your Rating' : '⭐ Rate This Book'}
              </button>
            </div>
          </div>
        </div>

        {/* Rating Form (Toggleable) */}
        {showRatingForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-shelf-300 animate-slideUp">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-serif">
              Rate "{mockBook.title}"
            </h2>
            <MultiDimensionalRatingForm
              bookId={mockBook.id}
              onSuccess={handleRatingSuccess}
              onCancel={() => setShowRatingForm(false)}
            />
          </div>
        )}

        {/* Book Fingerprint */}
        <div className="mb-8">
          <BookFingerprint bookId={mockBook.id} initialFingerprint={mockFingerprint} />
        </div>

        {/* Explanation Section */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 border border-purple-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 font-serif">
            How Multi-Dimensional Ratings Work
          </h3>
          <div className="space-y-4 text-gray-700">
            <div className="flex gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <h4 className="font-semibold mb-1">Rate 7 Dimensions</h4>
                <p>
                  Instead of a single star rating, rate pace, emotional impact,
                  complexity, character development, plot quality, prose style, and
                  originality.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <h4 className="font-semibold mb-1">Create a Fingerprint</h4>
                <p>
                  Your ratings combine with others to create a unique "fingerprint"
                  for each book, shown as a radar chart.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <h4 className="font-semibold mb-1">Discover Similar Books</h4>
                <p>
                  Our algorithm finds books with similar fingerprints, enabling
                  queries like "books like X but faster-paced."
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-purple-300">
            <p className="text-sm text-gray-600 italic">
              💡 <strong>Pro tip:</strong> You don't need to rate every dimension. Rate
              only what matters to you!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
