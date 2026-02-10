const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(body.detail || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { username: string; email: string; password: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { username: string; password: string }) =>
    request<{ access_token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<import('../types').User>('/api/auth/me'),

  getProfile: () => request<import('../types').UserProfile>('/api/auth/profile'),

  // Books
  getBooks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<import('../types').BookSummary[]>(`/api/books${qs}`);
  },

  getBook: (id: number) => request<import('../types').BookDetail>(`/api/books/${id}`),

  createBook: (data: Record<string, unknown>) =>
    request('/api/books', { method: 'POST', body: JSON.stringify(data) }),

  importBook: (data: { query: string; isbn: boolean }) =>
    request('/api/books/import', { method: 'POST', body: JSON.stringify(data) }),

  // Genres
  getGenres: () => request<import('../types').Genre[]>('/api/genres'),

  // Library
  getLibrary: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<import('../types').UserBook[]>(`/api/library${qs}`);
  },

  addToLibrary: (data: { book_id: number; status: string }) =>
    request('/api/library', { method: 'POST', body: JSON.stringify(data) }),

  updateLibraryEntry: (bookId: number, data: { status?: string; rating?: number }) =>
    request(`/api/library/${bookId}`, { method: 'PUT', body: JSON.stringify(data) }),

  removeFromLibrary: (bookId: number) =>
    request(`/api/library/${bookId}`, { method: 'DELETE' }),

  // Reviews
  createReview: (data: { book_id: number; review_text: string }) =>
    request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),

  updateReview: (id: number, data: { review_text: string }) =>
    request(`/api/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteReview: (id: number) =>
    request(`/api/reviews/${id}`, { method: 'DELETE' }),

  // Content Ratings
  getBookContentRatings: (bookId: number) =>
    request<import('../types').ContentRating[]>(`/api/content-ratings/book/${bookId}`),

  createContentRating: (data: {
    book_id: number;
    violence_level: number;
    language_level: number;
    sexual_content_level: number;
    substance_use_level: number;
    other_tags: string[];
  }) => request('/api/content-ratings', { method: 'POST', body: JSON.stringify(data) }),

  updateContentRating: (id: number, data: Record<string, unknown>) =>
    request(`/api/content-ratings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
