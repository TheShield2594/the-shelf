import type {
  AuthToken,
  BookDetail,
  BookLookupResult,
  BookSummary,
  GoodreadsImportResult,
  MultiDimensionalRating,
  Review,
  User,
  UserBook,
  UserProfile,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const TOKEN_KEY = 'shelf_auth_token';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const resp = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (resp.status === 204) {
      return undefined as T;
    }

    if (resp.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    if (!resp.ok) {
      const error = await resp.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed: ${resp.status}`);
    }

    return resp.json();
  }

  // Auth
  async login(username: string, password: string): Promise<AuthToken> {
    const result = await this.request<AuthToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(result.access_token);
    return result;
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
  async listBooks(params?: { q?: string; genre?: string; limit?: number; offset?: number }): Promise<BookSummary[]> {
    const query = new URLSearchParams();n    if (params?.q) query.set('q', params.q);
    if (params?.genre) query.set('genre', params.genre);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return this.request<BookSummary[]>(`/api/books?${query.toString()}`);
  }

  async getBook(id: number): Promise<BookDetail> {
    return this.request<BookDetail>(`/api/books/${id}`);
  }

  async createBook(data: Partial<BookSummary> & { title: string; author: string }): Promise<BookSummary> {
    return this.request<BookSummary>('/api/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async lookupIsbn(isbn: string, save = false): Promise<BookLookupResult> {
    const query = save ? '?save=true' : '';
    return this.request<BookLookupResult>(`/api/books/lookup/${isbn}${query}`);
  }

  async searchExternal(q: string): Promise<BookSummary[]> {
    return this.request<BookSummary[]>(`/api/books/search-external?q=${encodeURIComponent(q)}`);
  }

  // Library
  async getLibrary(status?: string): Promise<UserBook[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<UserBook[]>(`/api/library${query}`);
  }

  async addToLibrary(bookId: number, status = 'want_to_read'): Promise<UserBook> {
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
    await this.request<void>(`/api/library/${bookId}`, { method: 'DELETE' });
  }

  // Reviews
  async getBookReviews(bookId: number): Promise<Review[]> {
    return this.request<Review[]>(`/api/reviews/book/${bookId}`);
  }

  async createReview(bookId: number, reviewText: string): Promise<Review> {
    return this.request<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, review_text: reviewText }),
    });
  }

  async updateReview(reviewId: number, reviewText: string): Promise<Review> {
    return this.request<Review>(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify({ review_text: reviewText }),
    });
  }

  async deleteReview(reviewId: number): Promise<void> {
    await this.request<void>(`/api/reviews/${reviewId}`, { method: 'DELETE' });
  }

  // Multi-dimensional ratings
  async createOrUpdateRating(rating: MultiDimensionalRating): Promise<MultiDimensionalRating> {
    return this.request<MultiDimensionalRating>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  async getUserRating(bookId: number): Promise<MultiDimensionalRating | null> {
    try {
      return await this.request<MultiDimensionalRating>(`/api/ratings/${bookId}`);
    } catch {
      return null;
    }
  }

  async deleteRating(bookId: number): Promise<void> {
    await this.request<void>(`/api/ratings/${bookId}`, { method: 'DELETE' });
  }

  // Goodreads import
  async importGoodreads(file: File): Promise<GoodreadsImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const resp = await fetch(`${API_URL}/api/goodreads/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!resp.ok) {
      const error = await resp.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(error.detail || 'Import failed');
    }

    return resp.json();
  }
}

const api = new ApiClient();
export default api;
