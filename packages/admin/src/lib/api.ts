/**
 * API client — thin wrapper around fetch that handles:
 *  - Base URL (proxied through Vite in dev)
 *  - JWT token injection
 *  - JSON parsing
 *  - Error handling
 */

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('stash_token');
}

export function setToken(token: string): void {
  localStorage.setItem('stash_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('stash_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status, data.details);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];

  constructor(message: string, status: number, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ── Auth ──────────────────────────────────────────────────

export const api = {
  auth: {
    login(email: string, password: string) {
      return request<{ token: string; user: { id: string; email: string; name: string; role: string; mustChangePassword: boolean } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
    },
    me() {
      return request<{ id: string; email: string; name: string; role: string; mustChangePassword: boolean }>('/auth/me');
    },
    changePassword(currentPassword: string, newPassword: string) {
      return request<{ message: string }>(
        '/auth/change-password',
        { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
      );
    },
  },

  // ── Items ─────────────────────────────────────────────────

  items: {
    list(params?: Record<string, string>) {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/items${qs}`);
    },
    get(id: string) {
      return request<any>(`/items/${id}`);
    },
    create(data: Record<string, unknown>) {
      return request<any>('/items', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: Record<string, unknown>) {
      return request<any>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    updateFate(id: string, fate: string, estimatedSaleValue?: number | null) {
      return request<any>(`/items/${id}/fate`, {
        method: 'PATCH',
        body: JSON.stringify({ fate, estimatedSaleValue }),
      });
    },
    delete(id: string) {
      return request<void>(`/items/${id}`, { method: 'DELETE' });
    },
    uploadPhoto(id: string, file: File) {
      const form = new FormData();
      form.append('photo', file);
      return request<{ photoPath: string; url: string }>(`/items/${id}/photo`, {
        method: 'POST',
        body: form,
      });
    },
    deletePhoto(id: string) {
      return request<void>(`/items/${id}/photo`, { method: 'DELETE' });
    },
    getQRCode(id: string) {
      return request<{ dataUrl: string }>(`/items/${id}/qrcode`);
    },
    generateQRCode(id: string) {
      return request<{ qrCodePath: string; url: string }>(`/items/${id}/qrcode`, { method: 'POST' });
    },
  },

  // ── Containers ────────────────────────────────────────────

  containers: {
    list() {
      return request<any[]>('/containers');
    },
    get(id: string) {
      return request<any>(`/containers/${id}`);
    },
    create(data: Record<string, unknown>) {
      return request<any>('/containers', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: Record<string, unknown>) {
      return request<any>(`/containers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
  },

  // ── Locations ─────────────────────────────────────────────

  locations: {
    list(type?: string) {
      const qs = type ? `?type=${type}` : '';
      return request<any[]>(`/locations${qs}`);
    },
    get(id: string) {
      return request<any>(`/locations/${id}`);
    },
    create(data: Record<string, unknown>) {
      return request<any>('/locations', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: Record<string, unknown>) {
      return request<any>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    delete(id: string) {
      return request<void>(`/locations/${id}`, { method: 'DELETE' });
    },
  },

  // ── Categories ────────────────────────────────────────────

  categories: {
    list() {
      return request<any[]>('/categories');
    },
    get(id: string) {
      return request<any>(`/categories/${id}`);
    },
    create(data: Record<string, unknown>) {
      return request<any>('/categories', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: Record<string, unknown>) {
      return request<any>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    delete(id: string) {
      return request<void>(`/categories/${id}`, { method: 'DELETE' });
    },
  },

  // ── Placements ────────────────────────────────────────────

  placements: {
    list(params?: Record<string, string>) {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/placements${qs}`);
    },
    create(itemId: string, containerId: string, notes?: string) {
      return request<any>('/placements', {
        method: 'POST',
        body: JSON.stringify({ itemId, containerId, notes }),
      });
    },
    remove(id: string) {
      return request<any>(`/placements/${id}/remove`, { method: 'PATCH' });
    },
  },

  // ── Activity ──────────────────────────────────────────────

  activity: {
    list(params?: Record<string, string>) {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ logs: any[]; total: number }>(`/activity${qs}`);
    },
  },

  // ── Stats ─────────────────────────────────────────────────

  stats: {
    get() {
      return request<any>('/stats');
    },
  },
};
