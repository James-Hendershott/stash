/**
 * Mobile API client — similar to admin but uses SecureStore instead
 * of localStorage for token persistence.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'stash_token';

// Default to Tailscale IP for production. Override in Settings screen.
let baseUrl = 'http://100.122.58.114:3001/api';

export function getBaseUrl(): string {
  return baseUrl;
}

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, ''); // strip trailing slash
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);

  return data as T;
}

export const api = {
  auth: {
    login(email: string, password: string) {
      return request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    me() {
      return request<any>('/auth/me');
    },
  },

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
    updateFate(id: string, fate: string) {
      return request<any>(`/items/${id}/fate`, {
        method: 'PATCH',
        body: JSON.stringify({ fate }),
      });
    },
    uploadPhoto(id: string, uri: string) {
      const form = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      form.append('photo', { uri, name: filename, type: mimeType } as any);
      return request<{ photoPath: string; url: string }>(`/items/${id}/photo`, {
        method: 'POST',
        body: form,
      });
    },
    getQRCode(id: string) {
      return request<{ dataUrl: string }>(`/items/${id}/qrcode`);
    },
    requestPriceEstimate(id: string) {
      return request<any>(`/items/${id}/price-estimate`, { method: 'POST' });
    },
  },

  containers: {
    list() {
      return request<any[]>('/containers');
    },
    get(id: string) {
      return request<any>(`/containers/${id}`);
    },
    get3dData(id: string) {
      return request<{ container: any; items: any[] }>(`/containers/${id}/3d`);
    },
  },

  categories: {
    list() {
      return request<any[]>('/categories');
    },
  },

  locations: {
    list() {
      return request<any[]>('/locations');
    },
  },

  stats: {
    get() {
      return request<any>('/stats');
    },
  },
};
