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
  APIError,
  GoodreadsImportResult,
  GoodreadsPendingMatch,
  GoodreadsResolveResult,
  ISBNDetailLookupResult,
  GamificationStats,
  ReadingSessionOut,
  LogSessionResponse,
  ChallengeOut,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class APIClient {
  private baseURL: string;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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

    const response = await fetch(url, { ...options, headers, credentials: 'include' });

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
  clearLocalState() {
    this.invalidateCache();
  }

  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const err: APIError = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail);
    }
    return response.json();
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseURL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    this.clearLocalState();
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

  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request<void>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
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

  async getBook(id: number, signal?: AbortSignal): Promise<Book> {
    const cacheKey = `book:${id}`;
    const cached = this.getCached<Book>(cacheKey, 15_000);
    if (cached) return cached;
    const book = await this.request<Book>(`/api/books/${id}`, { signal });
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
  async getLibrary(status?: string, signal?: AbortSignal): Promise<UserBook[]> {
    const query = status ? `?status=${status}` : '';
    const cacheKey = `library${query}`;
    const cached = this.getCached<UserBook[]>(cacheKey, 5_000);
    if (cached) return cached;
    const books = await this.request<UserBook[]>(`/api/library${query}`, { signal });
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

    const response = await fetch(`${this.baseURL}/api/goodreads/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const err: APIError = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail);
    }
    return response.json();
  }

  async resolveGoodreadsMatch(
    pending: GoodreadsPendingMatch,
    isbn: string
  ): Promise<GoodreadsResolveResult> {
    return this.request<GoodreadsResolveResult>('/api/goodreads/resolve', {
      method: 'POST',
      body: JSON.stringify({ ...pending, isbn }),
    });
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

  // Gamification (private, self-referential stats - streaks, XP, badges)
  async getGamificationStats(): Promise<GamificationStats> {
    const cached = this.getCached<GamificationStats>('gamification_stats', 10_000);
    if (cached) return cached;
    const stats = await this.request<GamificationStats>('/api/gamification/stats');
    this.setCached('gamification_stats', stats, 10_000);
    return stats;
  }

  async getReadingSessions(limit = 30): Promise<ReadingSessionOut[]> {
    return this.request<ReadingSessionOut[]>(`/api/gamification/sessions?limit=${limit}`);
  }

  async logReadingSession(data: {
    session_date: string;
    minutes_read: number;
    pages_read?: number;
    book_id?: number;
  }): Promise<LogSessionResponse> {
    const result = await this.request<LogSessionResponse>('/api/gamification/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache('gamification');
    return result;
  }

  async getChallenges(): Promise<ChallengeOut[]> {
    const cached = this.getCached<ChallengeOut[]>('challenges', 10_000);
    if (cached) return cached;
    const challenges = await this.request<ChallengeOut[]>('/api/gamification/challenges');
    this.setCached('challenges', challenges, 10_000);
    return challenges;
  }
}

export const api = new APIClient(API_URL);
