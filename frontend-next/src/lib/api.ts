// API client for The Shelf backend

import type {
  Book,
  BookSummary,
  MultiDimensionalRating,
  BookFingerprint,
  RadarChartData,
  User,
  UserProfile,
  UserBook,
  AuthTokens,
  APIError,
  GoodreadsImportResult,
  ISBNDetailLookupResult,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class APIClient {
  private baseURL: string;
  private token: string | null = null;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private getCached<T>(key: string, maxAge: number): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data as T;
    }
    return null;
  }

  private setCached(key: string, data: unknown, maxAge: number) {
    this.cache.set(key, { data, expiry: Date.now() + maxAge });
  }

  private invalidateCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error: APIError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const err = new Error(error.detail) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    this.invalidateCache();
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const err: APIError = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail);
    }
    const tokens: AuthTokens = await response.json();
    this.setToken(tokens.access_token);
    return tokens;
  }

  async register(username: string, email: string, password: string): Promise<User> {
    return this.request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async getCurrentUser(): Promise<User> {
    const cached = this.getCached<User>('current_user', 30_000);
    if (cached) return cached;
    const user = await this.request<User>('/api/auth/me');
    this.setCached('current_user', user, 30_000);
    return user;
  }

  async getProfile(): Promise<UserProfile> {
    const cached = this.getCached<UserProfile>('profile', 15_000);
    if (cached) return cached;
    const profile = await this.request<UserProfile>('/api/auth/profile');
    this.setCached('profile', profile, 15_000);
    return profile;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request<void>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async changeEmail(newEmail: string, currentPassword: string): Promise<User> {
    const user = await this.request<User>('/api/auth/email', {
      method: 'PUT',
      body: JSON.stringify({ new_email: newEmail, current_password: currentPassword }),
    });
    this.invalidateCache('current_user');
    return user;
  }

  // Books
  async deleteBook(bookId: number): Promise<void> {
    await this.request<void>(`/api/books/${bookId}`, { method: 'DELETE' });
    this.invalidateCache('books');
  }

  async getBooks(params?: Record<string, string>, signal?: AbortSignal): Promise<BookSummary[]> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    const cacheKey = `books${query}`;
    const cached = this.getCached<BookSummary[]>(cacheKey, 10_000);
    if (cached) return cached;
    const books = await this.request<BookSummary[]>(`/api/books${query}`, { signal });
    this.setCached(cacheKey, books, 10_000);
    return books;
  }

  async getBook(id: number): Promise<Book> {
    const cacheKey = `book:${id}`;
    const cached = this.getCached<Book>(cacheKey, 15_000);
    if (cached) return cached;
    const book = await this.request<Book>(`/api/books/${id}`);
    this.setCached(cacheKey, book, 15_000);
    return book;
  }

  async createBook(data: Partial<BookSummary>): Promise<Book> {
    const book = await this.request<Book>('/api/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache('books');
    return book;
  }

  async lookupISBN(isbn: string, save = false): Promise<ISBNDetailLookupResult> {
    return this.request<ISBNDetailLookupResult>(
      `/api/books/lookup/${encodeURIComponent(isbn)}${save ? '?save=true' : ''}`
    );
  }

  async searchExternal(q: string, limit = 10): Promise<BookSummary[]> {
    return this.request<BookSummary[]>(`/api/books/search-external?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  // Library
  async getLibrary(status?: string): Promise<UserBook[]> {
    const query = status ? `?status=${status}` : '';
    const cacheKey = `library${query}`;
    const cached = this.getCached<UserBook[]>(cacheKey, 5_000);
    if (cached) return cached;
    const books = await this.request<UserBook[]>(`/api/library${query}`);
    this.setCached(cacheKey, books, 5_000);
    return books;
  }

  async addToLibrary(bookId: number, status: string): Promise<UserBook> {
    const ub = await this.request<UserBook>('/api/library', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, status }),
    });
    this.invalidateCache('library');
    return ub;
  }

  async updateLibraryEntry(bookId: number, data: { status?: string; rating?: number }): Promise<UserBook> {
    const ub = await this.request<UserBook>(`/api/library/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.invalidateCache('library');
    return ub;
  }

  async removeFromLibrary(bookId: number): Promise<void> {
    await this.request<void>(`/api/library/${bookId}`, { method: 'DELETE' });
    this.invalidateCache('library');
  }

  // Reviews
  async createReview(bookId: number, reviewText: string): Promise<any> {
    const review = await this.request<any>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, review_text: reviewText }),
    });
    this.invalidateCache(`book:${bookId}`);
    return review;
  }

  // Goodreads import
  async importGoodreads(file: File): Promise<GoodreadsImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/api/goodreads/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err: APIError = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail);
    }
    return response.json();
  }

  // Multi-dimensional ratings
  async createOrUpdateRating(rating: Partial<MultiDimensionalRating>): Promise<MultiDimensionalRating> {
    const r = await this.request<MultiDimensionalRating>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
    // Invalidate book, fingerprint, and chart cache keys since rating data changed
    this.invalidateCache(`book:${rating.book_id}`);
    this.invalidateCache(`fingerprint:${rating.book_id}`);
    this.invalidateCache(`chart:${rating.book_id}`);
    return r;
  }

  async getUserRating(bookId: number): Promise<MultiDimensionalRating> {
    return this.request<MultiDimensionalRating>(`/api/ratings/${bookId}`);
  }

  async deleteRating(bookId: number): Promise<void> {
    await this.request<void>(`/api/ratings/${bookId}`, { method: 'DELETE' });
    // Invalidate book, fingerprint, and chart cache keys since rating data changed
    this.invalidateCache(`book:${bookId}`);
    this.invalidateCache(`fingerprint:${bookId}`);
    this.invalidateCache(`chart:${bookId}`);
  }

  async getBookFingerprint(bookId: number): Promise<BookFingerprint> {
    const cacheKey = `fingerprint:${bookId}`;
    const cached = this.getCached<BookFingerprint>(cacheKey, 30_000);
    if (cached) return cached;
    const fp = await this.request<BookFingerprint>(`/api/ratings/${bookId}/fingerprint`);
    this.setCached(cacheKey, fp, 30_000);
    return fp;
  }

  async getRadarChartData(bookId: number): Promise<RadarChartData> {
    const cacheKey = `chart:${bookId}`;
    const cached = this.getCached<RadarChartData>(cacheKey, 30_000);
    if (cached) return cached;
    const data = await this.request<RadarChartData>(`/api/ratings/${bookId}/chart-data`);
    this.setCached(cacheKey, data, 30_000);
    return data;
  }
}

export const api = new APIClient(API_URL);
