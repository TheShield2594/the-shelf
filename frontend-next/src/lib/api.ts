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
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error: APIError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.detail);
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
    return this.request<User>('/api/auth/me');
  }

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/auth/profile');
  }

  // Books
  async getBooks(params?: Record<string, string>): Promise<BookSummary[]> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<BookSummary[]>(`/api/books${query}`);
  }

  async getBook(id: number): Promise<Book> {
    return this.request<Book>(`/api/books/${id}`);
  }

  async createBook(data: Partial<BookSummary>): Promise<Book> {
    return this.request<Book>('/api/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async lookupISBN(isbn: string, save = false): Promise<{ source: string; book: BookSummary }> {
    return this.request<{ source: string; book: BookSummary }>(
      `/api/books/lookup/${isbn}${save ? '?save=true' : ''}`
    );
  }

  async searchExternal(q: string, limit = 10): Promise<BookSummary[]> {
    return this.request<BookSummary[]>(`/api/books/search-external?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  // Library
  async getLibrary(status?: string): Promise<UserBook[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<UserBook[]>(`/api/library${query}`);
  }

  async addToLibrary(bookId: number, status: string): Promise<UserBook> {
    return this.request<UserBook>('/api/library', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, status }),
    });
  }

  async updateLibraryEntry(bookId: number, data: { status?: string; rating?: number }): Promise<UserBook> {
    return this.request<UserBook>(`/api/library/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeFromLibrary(bookId: number): Promise<void> {
    return this.request<void>(`/api/library/${bookId}`, { method: 'DELETE' });
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
    return this.request<MultiDimensionalRating>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  async getUserRating(bookId: number): Promise<MultiDimensionalRating> {
    return this.request<MultiDimensionalRating>(`/api/ratings/${bookId}`);
  }

  async deleteRating(bookId: number): Promise<void> {
    return this.request<void>(`/api/ratings/${bookId}`, { method: 'DELETE' });
  }

  async getBookFingerprint(bookId: number): Promise<BookFingerprint> {
    return this.request<BookFingerprint>(`/api/ratings/${bookId}/fingerprint`);
  }

  async getRadarChartData(bookId: number): Promise<RadarChartData> {
    return this.request<RadarChartData>(`/api/ratings/${bookId}/chart-data`);
  }
}

export const api = new APIClient(API_URL);
