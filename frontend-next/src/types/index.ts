// Type definitions for The Shelf

export interface MultiDimensionalRating {
  id?: number;
  user_id?: number;
  book_id: number;
  pace?: number;
  emotional_impact?: number;
  complexity?: number;
  character_development?: number;
  plot_quality?: number;
  prose_style?: number;
  originality?: number;
  star_equivalent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BookFingerprint {
  book_id: number;
  avg_pace?: number;
  avg_emotional_impact?: number;
  avg_complexity?: number;
  avg_character_development?: number;
  avg_plot_quality?: number;
  avg_prose_style?: number;
  avg_originality?: number;
  star_equivalent?: number;
  total_ratings: number;
  has_ratings?: boolean;
  updated_at: string;
}

export interface RadarChartDimension {
  dimension: string;
  value: number;
  fullMark?: number;
}

export interface RadarChartData {
  dimensions: RadarChartDimension[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ContentRatingAvg {
  violence_level: number;
  language_level: number;
  sexual_content_level: number;
  substance_use_level: number;
  common_tags: string[];
  count: number;
}

export interface BookSummary {
  id?: number;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  cover_url?: string;
  publication_date?: string;
  genres: Genre[];
  avg_rating?: number;
  rating_count: number;
  content_rating?: ContentRatingAvg | null;
}

export interface Review {
  id: number;
  user_id: number;
  username: string;
  book_id: number;
  review_text: string;
  created_at: string;
  updated_at: string;
}

export interface RelatedBook {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
}

export interface Book extends BookSummary {
  created_at?: string;
  reviews?: Review[];
  related_books?: RelatedBook[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  created_at: string;
  books_read: number;
  currently_reading: number;
  want_to_read: number;
  dnf: number;
  reviews_count: number;
}

export interface UserBook {
  id: number;
  book_id: number;
  status: 'want_to_read' | 'currently_reading' | 'finished' | 'dnf';
  rating: number | null;
  date_added: string;
  date_started: string | null;
  date_finished: string | null;
  book: BookSummary;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface APIError {
  detail: string;
}

export interface GoodreadsImportResult {
  imported: number;
  skipped: number;
  errors: number;
  total: number;
  results: { title: string; status: string; error?: string }[];
}

export interface ISBNDetailLookupResult {
  source: string;
  book: BookSummary;
}

// Gamification (private, self-referential - see PRODUCT_VISION.md)
export interface BadgeOut {
  code: string;
  name: string;
  description: string;
  earned_at: string;
}

export interface GamificationStats {
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  mascot_mood: 'neutral' | 'content' | 'happy' | 'ecstatic';
  badges: BadgeOut[];
}

export interface ReadingSessionOut {
  id: number;
  book_id: number | null;
  session_date: string;
  minutes_read: number;
  pages_read: number | null;
}

export interface LogSessionResponse {
  session: ReadingSessionOut;
  stats: GamificationStats;
  new_badges: BadgeOut[];
}

// Dimension metadata for UI
export interface DimensionInfo {
  key: keyof Omit<MultiDimensionalRating, 'id' | 'user_id' | 'book_id' | 'star_equivalent' | 'created_at' | 'updated_at'>;
  label: string;
  shortLabel: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export const RATING_DIMENSIONS: DimensionInfo[] = [
  {
    key: 'pace',
    label: 'Pace',
    shortLabel: 'Pace',
    description: 'How fast or slow does the book read?',
    lowLabel: 'Very Slow',
    highLabel: 'Very Fast',
  },
  {
    key: 'emotional_impact',
    label: 'Emotional Impact',
    shortLabel: 'Emotion',
    description: 'How emotionally affecting is the book?',
    lowLabel: 'Low Impact',
    highLabel: 'Devastating',
  },
  {
    key: 'complexity',
    label: 'Complexity',
    shortLabel: 'Complexity',
    description: 'How intellectually dense is the book?',
    lowLabel: 'Simple',
    highLabel: 'Dense',
  },
  {
    key: 'character_development',
    label: 'Character Development',
    shortLabel: 'Character',
    description: 'How well-developed are the characters?',
    lowLabel: 'Weak',
    highLabel: 'Exceptional',
  },
  {
    key: 'plot_quality',
    label: 'Plot Quality',
    shortLabel: 'Plot',
    description: 'How well-structured is the story?',
    lowLabel: 'Poor',
    highLabel: 'Excellent',
  },
  {
    key: 'prose_style',
    label: 'Prose Style',
    shortLabel: 'Prose',
    description: 'How beautiful is the writing?',
    lowLabel: 'Weak',
    highLabel: 'Beautiful',
  },
  {
    key: 'originality',
    label: 'Originality',
    shortLabel: 'Originality',
    description: 'How novel and creative is the book?',
    lowLabel: 'Derivative',
    highLabel: 'Groundbreaking',
  },
];
