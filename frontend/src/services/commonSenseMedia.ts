/**
 * Common Sense Media API Integration
 *
 * Common Sense Media provides content ratings for books, movies, TV shows, and more.
 *
 * SETUP REQUIRED:
 * 1. Apply for API access at: https://www.commonsensemedia.org/developers
 * 2. Establish a partnership agreement with Common Sense Media
 * 3. Obtain API credentials (API key)
 * 4. Set CSM_API_KEY in your backend .env file (NOT frontend)
 * 5. Implement backend proxy endpoint at /api/csm/*
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
 * SECURITY: All CSM API requests are proxied through the backend to protect
 * the API key. Never expose the CSM_API_KEY in frontend code.
 *
 * Note: CSM requires data to be pulled regularly and stored locally;
 * they do not support on-demand requests.
 */

// Backend proxy base URL
const CSM_PROXY_BASE = '/api/csm';

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
 * Check if CSM API is configured (by testing backend availability)
 */
export async function isCSMConfigured(): Promise<boolean> {
  try {
    const response = await fetch(`${CSM_PROXY_BASE}/health`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Search for a book review on Common Sense Media via backend proxy
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
  try {
    const response = await fetch(
      `${CSM_PROXY_BASE}/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('CSM API not configured on backend');
      } else {
        console.error('CSM API error:', response.status, response.statusText);
      }
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
 *
 * @throws {RangeError} if rating is not a number or outside 0-5 range
 */
export function convertCSMRating(csmRating: number): number {
  // Validate input
  if (typeof csmRating !== 'number' || !Number.isFinite(csmRating)) {
    throw new RangeError(`Invalid CSM rating: expected number, got ${typeof csmRating}`);
  }

  if (csmRating < 0 || csmRating > 5) {
    throw new RangeError(`CSM rating must be between 0-5, got ${csmRating}`);
  }

  // Map CSM's 0-5 scale to our 0-4 scale
  // 0 -> 0, 1 -> 0, 2 -> 1, 3 -> 2, 4 -> 3, 5 -> 4
  if (csmRating <= 1) return 0;
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
 * Bulk fetch CSM ratings for multiple books with parallel processing
 * Useful for periodic updates as CSM requires local storage
 *
 * @param books - Array of {title, author} objects
 * @param options - Optional configuration
 * @param options.signal - AbortSignal for cancellation
 * @param options.onProgress - Progress callback (index, result)
 * @param options.concurrency - Max parallel requests (default: 5)
 * @returns Array of ratings (null for books not found)
 */
export async function bulkFetchCSMRatings(
  books: Array<{ title: string; author?: string }>,
  options: {
    signal?: AbortSignal;
    onProgress?: (index: number, result: Awaited<ReturnType<typeof getBookContentRating>>) => void;
    concurrency?: number;
  } = {}
): Promise<Array<Awaited<ReturnType<typeof getBookContentRating>>>> {
  const { signal, onProgress, concurrency = 5 } = options;
  const results: Array<Awaited<ReturnType<typeof getBookContentRating>>> = new Array(books.length);

  // Rate limiting: 100 req/min = ~600ms per request minimum
  const minDelay = 650;
  let lastRequestTime = 0;

  async function processBook(index: number) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const book = books[index];

    // Throttle to respect rate limits
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    try {
      const rating = await getBookContentRating(book.title, book.author);
      results[index] = rating;
      onProgress?.(index, rating);
      return rating;
    } catch (error) {
      // Isolate failures - continue with other books
      results[index] = null;
      onProgress?.(index, null);
      console.error(`Failed to fetch CSM rating for "${book.title}":`, error);
      return null;
    }
  }

  // Process books with controlled concurrency
  const queue = books.map((_, index) => index);
  const workers = Array.from({ length: Math.min(concurrency, books.length) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index !== undefined) {
        await processBook(index);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
