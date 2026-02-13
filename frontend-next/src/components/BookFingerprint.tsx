'use client';

import { useEffect, useState } from 'react';
import { RadarChart } from './RadarChart';
import { RATING_DIMENSIONS, type BookFingerprint as FingerprintType } from '@/types';
import { formatRating, getRatingColor } from '@/lib/utils';
import { api } from '@/lib/api';

interface BookFingerprintProps {
  bookId: number;
  initialFingerprint?: FingerprintType;
}

export function BookFingerprint({ bookId, initialFingerprint }: BookFingerprintProps) {
  const [fingerprint, setFingerprint] = useState<FingerprintType | null>(
    initialFingerprint || null
  );
  const [isLoading, setIsLoading] = useState(!initialFingerprint);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialFingerprint) {
      fetchFingerprint();
    }
  }, [bookId]);

  const fetchFingerprint = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBookFingerprint(bookId);
      setFingerprint(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fingerprint');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!fingerprint || fingerprint.total_ratings === 0) {
    return (
      <div className="bg-gradient-to-br from-shelf-50 to-white rounded-xl shadow-lg p-8 text-center border border-shelf-200">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Ratings Yet
        </h3>
        <p className="text-gray-600">
          Be the first to rate this book with our multi-dimensional rating system!
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = RATING_DIMENSIONS.map((dim) => ({
    dimension: dim.shortLabel,
    value: (fingerprint as any)[`avg_${dim.key}`] || 0,
    fullMark: 5,
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          Community Fingerprint
        </h3>
        <div className="text-sm text-gray-500">
          Based on{' '}
          <span className="font-semibold text-gray-700">
            {fingerprint.total_ratings}
          </span>{' '}
          rating{fingerprint.total_ratings !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Radar Chart */}
      <RadarChart data={chartData} className="mb-6" />

      {/* Overall Star Equivalent */}
      {fingerprint.star_equivalent !== null && (
        <div className="text-center mb-6 pb-6 border-b border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-4xl font-bold ${getRatingColor(fingerprint.star_equivalent)}`}>
              {formatRating(fingerprint.star_equivalent)}
            </span>
            <span className="text-2xl text-gray-400">/5.0</span>
          </div>
        </div>
      )}

      {/* Dimension breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Dimension Breakdown
        </h4>
        {RATING_DIMENSIONS.map((dim) => {
          const value = (fingerprint as any)[`avg_${dim.key}`];
          if (value === null || value === undefined) return null;

          return (
            <div key={dim.key} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {dim.label}
                  </span>
                  <span className={`text-sm font-semibold ${getRatingColor(value)}`}>
                    {formatRating(value)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-shelf-500 rounded-full transition-all duration-300"
                    style={{ width: `${(value / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* What this means */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          This "fingerprint" shows the average rating across all dimensions.
          It helps you find books with a similar feel, not just genre.
        </p>
      </div>
    </div>
  );
}
