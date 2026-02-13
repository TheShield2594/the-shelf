const BASE_URL = "https://openlibrary.org";

// Common query fields to avoid duplication
const SEARCH_FIELDS = "key,title,author_name,cover_i,first_publish_year,subject,isbn,number_of_pages_median,ratings_average";
const BASIC_FIELDS = "key,title,author_name,cover_i,first_publish_year,subject,isbn";

/**
 * Helper to fetch JSON and handle errors
 */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(
      `Open Library API error: ${response.status} ${response.statusText}. ${text}`
    );
  }

  return response.json();
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
  ratings_average?: number;
}

export interface BookDetails {
  key: string;
  title: string;
  description?: string | { value: string };
  covers?: number[];
  subjects?: string[];
  first_publish_date?: string;
  authors?: Array<{ author: { key: string } }>;
}

export interface AuthorDetails {
  name: string;
  bio?: string | { value: string };
  birth_date?: string;
  photos?: number[];
}

export function getCoverUrl(coverId: number | undefined, size: "S" | "M" | "L" = "M") {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export async function searchBooks(query: string, limit = 20): Promise<OpenLibraryBook[]> {
  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=${SEARCH_FIELDS}`;
  const data = await fetchJson<{ docs: OpenLibraryBook[] }>(url);
  return data.docs || [];
}

export async function searchBooksByISBN(isbn: string): Promise<OpenLibraryBook[]> {
  const url = `${BASE_URL}/search.json?isbn=${encodeURIComponent(isbn)}&limit=5&fields=${SEARCH_FIELDS}`;
  const data = await fetchJson<{ docs: OpenLibraryBook[] }>(url);
  return data.docs || [];
}

export async function searchBooksBySubject(subject: string, limit = 12): Promise<OpenLibraryBook[]> {
  const url = `${BASE_URL}/search.json?subject=${encodeURIComponent(subject)}&limit=${limit}&fields=${BASIC_FIELDS}`;
  const data = await fetchJson<{ docs: OpenLibraryBook[] }>(url);
  return data.docs || [];
}

export async function getBookDetails(workKey: string): Promise<BookDetails> {
  const url = `${BASE_URL}${workKey}.json`;
  return fetchJson<BookDetails>(url);
}

export async function getTrendingBooks(limit = 12): Promise<OpenLibraryBook[]> {
  const url = `${BASE_URL}/search.json?q=*:*&sort=rating&limit=${limit}&fields=${SEARCH_FIELDS}`;
  const data = await fetchJson<{ docs: OpenLibraryBook[] }>(url);
  return data.docs || [];
}

export function getBookId(book: OpenLibraryBook): string {
  return book.key.replace("/works/", "");
}

export function getDescriptionText(desc?: string | { value: string }): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  return desc.value || "";
}

/**
 * Convert Open Library book data to a format compatible with our backend
 */
export function convertToBackendFormat(olBook: OpenLibraryBook) {
  return {
    title: olBook.title,
    author: olBook.author_name?.[0] || "Unknown Author",
    isbn: olBook.isbn?.[0] || null,
    description: null, // Will need to fetch details for description
    cover_url: getCoverUrl(olBook.cover_i, "L"),
    publication_year: olBook.first_publish_year || null,
    publication_date_precision: olBook.first_publish_year ? 'year' : null,
  };
}
