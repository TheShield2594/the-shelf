// API client for The Shelf backend

import type {
  Book,
  MultiDimensionalRating,
  BookFingerprint,
  RadarChartData,
  User,
  AuthTokens,
  APIError,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;

    // Load token from localStorage if in browser
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

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: APIError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.detail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth methods
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
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const tokens: AuthTokens = await response.json();
    this.setToken(tokens.access_token);
    return tokens;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  // Books
  async getBooks(params?: Record<string, string>): Promise<Book[]> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<Book[]>(`/api/books${query}`);
  }

  async getBook(id: number): Promise<Book> {
    return this.request<Book>(`/api/books/${id}`);
  }

  // Multi-dimensional ratings
  async createOrUpdateRating(
    rating: Partial<MultiDimensionalRating>
  ): Promise<MultiDimensionalRating> {
    return this.request<MultiDimensionalRating>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  async getUserRating(bookId: number): Promise<MultiDimensionalRating> {
    return this.request<MultiDimensionalRating>(`/api/ratings/${bookId}`);
  }

  async deleteRating(bookId: number): Promise<void> {
    return this.request<void>(`/api/ratings/${bookId}`, {
      method: 'DELETE',
    });
  }

  async getBookFingerprint(bookId: number): Promise<BookFingerprint> {
    return this.request<BookFingerprint>(`/api/ratings/${bookId}/fingerprint`);
  }

  async getRadarChartData(bookId: number): Promise<RadarChartData> {
    return this.request<RadarChartData>(`/api/ratings/${bookId}/chart-data`);
  }
}

// Export singleton instance
export const api = new APIClient(API_URL);
