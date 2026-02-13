interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  ratings_average?: number;
  ratings_count?: number;
  subject?: string[];
}

interface OpenLibraryResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export interface TrendingBook {
  key: string;
  title: string;
  authors: string[];
  publishYear?: number;
  coverUrl?: string;
  rating?: number;
  ratingsCount?: number;
  subjects: string[];
}

const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const COVER_BASE_URL = 'https://covers.openlibrary.org/b/id';

export async function fetchTrendingBooks(limit: number = 12): Promise<TrendingBook[]> {
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_BASE_URL}/search.json?q=*&sort=trending&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch trending books');
    }

    const data: OpenLibraryResponse = await response.json();

    return data.docs.map((doc) => ({
      key: doc.key,
      title: doc.title,
      authors: doc.author_name || ['Unknown Author'],
      publishYear: doc.first_publish_year,
      coverUrl: doc.cover_i
        ? `${COVER_BASE_URL}/${doc.cover_i}-M.jpg`
        : undefined,
      rating: doc.ratings_average,
      ratingsCount: doc.ratings_count,
      subjects: doc.subject?.slice(0, 3) || [],
    }));
  } catch (error) {
    console.error('Error fetching trending books:', error);
    return [];
  }
}
