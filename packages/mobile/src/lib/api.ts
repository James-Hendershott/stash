/**
 * Mobile API client — similar to admin but uses SecureStore instead
 * of localStorage for token persistence.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'stash_token';

// Default to the public HTTPS proxy — works on any network, no Tailscale
// needed. Override in Settings screen (Tailscale: http://100.122.58.114:3001).
let baseUrl = 'https://stash-api.shottsserver.com/api';

export function getBaseUrl(): string {
  return baseUrl;
}

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, ''); // strip trailing slash
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
}

/** Full URL for a stored file path (photos, QR codes). */
export function fileUrl(path: string): string {
  return `${baseUrl.replace(/\/api$/, '')}/api/files/${path}`;
}

// ── v2 (storage) response shapes ─────────────────────────────

export interface Whereabouts {
  status: string;
  container: { id: string; number: number | null; label: string; display: string } | null;
  location: { id: string; path: string; shortCode: string | null } | null;
  summary: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  parent?: { id: string; name: string } | null;
}

export interface ContainerSummary {
  id: string;
  number: number | null;
  label: string;
  display: string;
  name: string;
  description: string | null;
  lidColor: string | null;
  status: string;
  itemCount: number;
}

export interface ContainerScreenData {
  id: string;
  itemId: string;
  number: number | null;
  label: string;
  display: string;
  name: string;
  description: string | null;
  photoPath: string | null;
  category: CategoryRef;
  status: 'PACKING' | 'STORED' | 'AWAY';
  labelStatus: 'NONE' | 'NOT_PRINTED' | 'PRINTED';
  lidColor: string | null;
  bodyColor: string | null;
  model: { brand: string; name: string; capacity: string | null } | null;
  locationId: string | null;
  whereabouts: Whereabouts;
  /** Still on its old handwritten label ("Old #12") — needs a new ID (ADR-012). */
  needsNewId: boolean;
  /** What the printed QR encodes, e.g. https://stash.shottsserver.com/c/001 */
  qrUrl: string | null;
  itemCount: number;
  items: {
    id: string;
    name: string;
    description: string | null;
    photoPath: string | null;
    quantity: number;
    status: string;
    category: CategoryRef;
    container: { id: string; number: number | null; label: string } | null;
  }[];
}

export interface LocationTreeNode {
  id: string;
  name: string;
  kind: 'PLACE' | 'AREA' | 'SPOT';
  shortCode: string | null;
  parentId: string | null;
  containerCount: number;
  totalContainers: number;
  children: LocationTreeNode[];
}

export interface LocationContents {
  id: string;
  name: string;
  kind: string;
  shortCode: string | null;
  path: string;
  breadcrumbs: { id: string; name: string }[];
  children: { id: string; name: string; kind: string; shortCode: string | null; totalContainers: number }[];
  containers: ContainerSummary[];
  looseItems: { id: string; name: string; photoPath: string | null; quantity: number; status: string }[];
}

/** "Games & Tabletop › Role-Playing Games" */
export function categoryLabel(c?: CategoryRef | null): string {
  if (!c) return '';
  return c.parent ? `${c.parent.name} › ${c.name}` : c.name;
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
    changePassword(currentPassword: string, newPassword: string) {
      return request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
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
    // v2 container screen — by printed number (new QR labels) or by id (old ones)
    byNumber(number: number) {
      return request<ContainerScreenData>(`/containers/by-number/${number}`);
    },
    screen(id: string) {
      return request<ContainerScreenData>(`/containers/${id}/screen`);
    },
    assignNumber(id: string) {
      return request<{ id: string; number: number; display: string; labelStatus: string }>(`/containers/${id}/assign-number`, {
        method: 'POST',
      });
    },
    setLabelStatus(id: string, labelStatus: 'NOT_PRINTED' | 'PRINTED') {
      return request<{ id: string; labelStatus: string }>(`/containers/${id}/label-status`, {
        method: 'PATCH',
        body: JSON.stringify({ labelStatus }),
      });
    },
    setLocation(id: string, locationId: string | null) {
      return request<{ id: string; locationId: string | null; status: string }>(`/containers/${id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ locationId }),
      });
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
    // v2 storage tree
    tree() {
      return request<LocationTreeNode[]>('/locations/tree');
    },
    unplaced() {
      return request<ContainerSummary[]>('/locations/unplaced');
    },
    contents(id: string) {
      return request<LocationContents>(`/locations/${id}/contents`);
    },
    createInTree(data: { name: string; parentId: string | null; kind?: 'PLACE' | 'AREA' | 'SPOT'; shortCode?: string | null }) {
      return request<any>('/locations/tree', { method: 'POST', body: JSON.stringify(data) });
    },
  },

  stats: {
    get() {
      return request<any>('/stats');
    },
  },
};
