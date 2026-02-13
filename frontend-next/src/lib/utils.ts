// Utility functions

import { type ClassValue, clsx } from 'clsx';

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Calculate star equivalent from multi-dimensional rating
 */
export function calculateStarEquivalent(rating: {
  pace?: number;
  emotional_impact?: number;
  complexity?: number;
  character_development?: number;
  plot_quality?: number;
  prose_style?: number;
  originality?: number;
}): number | null {
  const values = [
    rating.pace,
    rating.emotional_impact,
    rating.complexity,
    rating.character_development,
    rating.plot_quality,
    rating.prose_style,
    rating.originality,
  ].filter((v): v is number => v !== undefined && v !== null);

  if (values.length === 0) return null;

  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Format a number to 1 decimal place
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return 'N/A';
  return rating.toFixed(1);
}

/**
 * Get color for rating value (1-5)
 */
export function getRatingColor(value: number): string {
  if (value >= 4.5) return 'text-green-600';
  if (value >= 4.0) return 'text-green-500';
  if (value >= 3.5) return 'text-yellow-600';
  if (value >= 3.0) return 'text-yellow-500';
  if (value >= 2.5) return 'text-orange-500';
  return 'text-red-500';
}
