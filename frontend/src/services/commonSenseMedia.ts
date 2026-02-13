/**
 * Common Sense Media API Integration
 *
 * Common Sense Media provides content ratings for books, movies, TV shows, and more.
 *
 * SETUP REQUIRED:
 * 1. Apply for API access at: https://www.commonsensemedia.org/developers
 * 2. Establish a partnership agreement with Common Sense Media
 * 3. Obtain API credentials (API key)
 * 4. Set VITE_CSM_API_KEY in your .env file
 *
 * API Documentation: https://www.commonsensemedia.org/developers/api/v3
 *
 * Key Features:
 * - Content ratings for violence, language, sexual content, drugs/alcohol
 * - Age recommendations
 * - Educational value ratings
 * - Positive messages and role models
 *
 * Rate Limiting: 100 unique requests per minute
 *
 * Note: CSM requires data to be pulled regularly and stored locally;
 * they do not support on-demand requests.
 */

const CSM_API_BASE = 'https://api.commonsensemedia.org/v3';
const API_KEY = import.meta.env.VITE_CSM_API_KEY;

export interface CSMContentRating {
  violence: number; // 0-5 scale
  scariness: number;
  language: number;
  sexual_content: number;
  drugs_alcohol: number;
  consumerism: number;
}

export interface CSMReview {
  id: string;
  title: string;
  type: 'book' | 'movie' | 'tv' | 'game' | 'app';
  age_recommendation: number;
  content_rating: CSMContentRating;
  learning_rating: number;
  positive_messages: number;
  role_models: number;
  review_url: string;
}

/**
 * Check if CSM API is configured
 */
export function isCSMConfigured(): boolean {
  return !!API_KEY;
}

/**
 * Search for a book review on Common Sense Media
 *
 * @param query - Book title or ISBN
 * @returns CSM review data if found
 *
 * Example:
 * ```
 * const review = await searchCSMReview("Harry Potter and the Sorcerer's Stone");
 * ```
 */
export async function searchCSMReview(query: string): Promise<CSMReview | null> {
  if (!API_KEY) {
    console.warn('CSM API key not configured. Set VITE_CSM_API_KEY in .env');
    return null;
  }

  try {
    const response = await fetch(
      `${CSM_API_BASE}/reviews/search?q=${encodeURIComponent(query)}&type=book`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('CSM API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error('CSM API request failed:', error);
    return null;
  }
}

/**
 * Convert CSM content ratings to our 0-4 scale
 * CSM uses 0-5, we use 0-4 (None, Mild, Moderate, Strong, Graphic)
 */
export function convertCSMRating(csmRating: number): number {
  // Map CSM's 0-5 scale to our 0-4 scale
  // 0 -> 0, 1 -> 0, 2 -> 1, 3 -> 2, 4 -> 3, 5 -> 4
  if (csmRating === 0 || csmRating === 1) return 0;
  if (csmRating === 2) return 1;
  if (csmRating === 3) return 2;
  if (csmRating === 4) return 3;
  return 4;
}

/**
 * Get CSM content rating for a book and format for our system
 *
 * @param bookTitle - The title of the book
 * @param author - Optional author name for better matching
 * @returns Formatted content rating data
 *
 * Example:
 * ```
 * const rating = await getBookContentRating("The Hunger Games", "Suzanne Collins");
 * if (rating) {
 *   // Use rating.violence_level, rating.language_level, etc.
 * }
 * ```
 */
export async function getBookContentRating(
  bookTitle: string,
  author?: string
): Promise<{
  violence_level: number;
  language_level: number;
  sexual_content_level: number;
  substance_use_level: number;
  source: 'csm';
  age_recommendation?: number;
  csm_url?: string;
} | null> {
  const query = author ? `${bookTitle} ${author}` : bookTitle;
  const review = await searchCSMReview(query);

  if (!review || !review.content_rating) {
    return null;
  }

  return {
    violence_level: convertCSMRating(review.content_rating.violence),
    language_level: convertCSMRating(review.content_rating.language),
    sexual_content_level: convertCSMRating(review.content_rating.sexual_content),
    substance_use_level: convertCSMRating(review.content_rating.drugs_alcohol),
    source: 'csm',
    age_recommendation: review.age_recommendation,
    csm_url: review.review_url,
  };
}

/**
 * Bulk fetch CSM ratings for multiple books
 * Useful for periodic updates as CSM requires local storage
 *
 * @param books - Array of {title, author} objects
 * @returns Array of ratings (null for books not found)
 */
export async function bulkFetchCSMRatings(
  books: Array<{ title: string; author?: string }>
): Promise<Array<Awaited<ReturnType<typeof getBookContentRating>>>> {
  // Add delay between requests to respect rate limiting (100 req/min)
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const results = [];
  for (const book of books) {
    const rating = await getBookContentRating(book.title, book.author);
    results.push(rating);
    await delay(650); // ~90 requests per minute to be safe
  }

  return results;
}
