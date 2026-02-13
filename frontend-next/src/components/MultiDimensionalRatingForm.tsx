'use client';

import { useState } from 'react';
import { RatingSlider } from './RatingSlider';
import { RadarChart } from './RadarChart';
import { RATING_DIMENSIONS, type MultiDimensionalRating } from '@/types';
import { cn, calculateStarEquivalent } from '@/lib/utils';
import { api } from '@/lib/api';

interface MultiDimensionalRatingFormProps {
  bookId: number;
  initialRating?: MultiDimensionalRating;
  onSuccess?: (rating: MultiDimensionalRating) => void;
  onCancel?: () => void;
}

export function MultiDimensionalRatingForm({
  bookId,
  initialRating,
  onSuccess,
  onCancel,
}: MultiDimensionalRatingFormProps) {
  const [rating, setRating] = useState<Partial<MultiDimensionalRating>>({
    book_id: bookId,
    pace: initialRating?.pace || 3,
    emotional_impact: initialRating?.emotional_impact || 3,
    complexity: initialRating?.complexity || 3,
    character_development: initialRating?.character_development || 3,
    plot_quality: initialRating?.plot_quality || 3,
    prose_style: initialRating?.prose_style || 3,
    originality: initialRating?.originality || 3,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.createOrUpdateRating(rating);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDimension = (key: string, value: number) => {
    setRating((prev) => ({ ...prev, [key]: value }));
  };

  // Prepare data for radar chart
  const chartData = RATING_DIMENSIONS.map((dim) => ({
    dimension: dim.shortLabel,
    value: rating[dim.key] || 0,
    fullMark: 5,
  }));

  const starEquivalent = calculateStarEquivalent(rating);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Radar Chart Preview */}
      <div className="bg-gradient-to-br from-shelf-50 to-white rounded-xl p-6 border border-shelf-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Your Rating Preview
        </h3>
        <RadarChart data={chartData} />
        {starEquivalent !== null && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">Star Equivalent</p>
            <p className="text-3xl font-bold text-shelf-700">
              {starEquivalent.toFixed(1)}
              <span className="text-lg text-gray-500">/5.0</span>
            </p>
          </div>
        )}
      </div>

      {/* Dimension Sliders */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Rate Each Dimension
          <span className="ml-2 text-sm font-normal text-gray-500">
            (All optional - rate only what matters to you)
          </span>
        </h3>

        {RATING_DIMENSIONS.map((dim) => (
          <RatingSlider
            key={dim.key}
            label={dim.label}
            description={dim.description}
            lowLabel={dim.lowLabel}
            highLabel={dim.highLabel}
            value={rating[dim.key] || 3}
            onChange={(value) => updateDimension(dim.key, value)}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex-1 bg-shelf-600 text-white px-6 py-3 rounded-lg font-medium',
            'hover:bg-shelf-700 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-shelf-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Saving...' : initialRating ? 'Update Rating' : 'Save Rating'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium mb-2">💡 Tips for rating:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Rate based on your experience, not what you think it "should" be</li>
          <li>You don't need to rate every dimension - skip what doesn't apply</li>
          <li>Your ratings help others find books with similar feels</li>
        </ul>
      </div>
    </form>
  );
}
