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
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  genres: Genre[];
  avg_rating: number | null;
  rating_count: number;
  content_rating: ContentRatingAvg | null;
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
  cover_url: string | null;
}

export interface BookDetail extends BookSummary {
  isbn: string | null;
  description: string | null;
  publication_date: string | null;
  created_at: string;
  reviews: Review[];
  related_books: RelatedBook[];
}

export interface UserBook {
  id: number;
  book_id: number;
  status: string;
  rating: number | null;
  date_added: string;
  date_started: string | null;
  date_finished: string | null;
  book: BookSummary;
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

export interface ContentRating {
  id: number;
  book_id: number;
  user_id: number;
  username: string;
  violence_level: number;
  language_level: number;
  sexual_content_level: number;
  substance_use_level: number;
  other_tags: string[];
  created_at: string;
}

export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'finished' | 'dnf';

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  finished: 'Finished',
  dnf: 'DNF',
};

export const CONTENT_LEVEL_LABELS = ['None', 'Mild', 'Moderate', 'Strong', 'Graphic'];

export const CONTENT_LEVEL_COLORS = [
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-orange-100 text-orange-800',
  'bg-red-100 text-red-800',
  'bg-red-200 text-red-900',
];
