import { loadImpersonation } from './impersonation';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE) {
  throw new Error('Missing VITE_API_BASE_URL');
}
type GetToken = () => Promise<string | null>;
let tokenProvider: GetToken | null = null;

export function setTokenProvider(provider: GetToken) {
  tokenProvider = provider;
}

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error: string };

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  impersonationToken?: string;
}

export interface ApiError extends Error {
  status: number;
}

export interface Tenant {
  customerId: string | null;
  customerMongoId: string | null;
  merchantId: string | null;
  name: string | null;
  email: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  cardsCount: number;
  events7d: number;
  events30d: number;
  lastActivity: string | null;
  newCards30d: number;
  stampsIssued30d: number;
  rewardsDelta30d: number;
  pointsEarned30d: number;
  pointsRedeemed30d: number;
  ids?: {
    customerId: string | null;
    customerMongoId: string | null;
    merchantId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
}

export interface Impersonation {
  token: string;
  expiresAt: string;
  targetCustomerId: string;
  targetMerchantId: string;
}


export interface KpiOverviewResponse {
  totals: {
    totalTenants: number;
    activeSubscriptions: number;
    totalCards: number;
    newCards: number;
    events:
      | number
      | {
          stampsIssued: number;
          rewardsDelta: number;
          pointsEarned: number;
          pointsRedeemed: number;
        };
    lastEventAt: string | null;
  };
}

export interface KpiTimeseriesResponse {
  series: {
    byDay: Array<{
      date: string;
      newCards: number;
      events:
        | number
        | {
            stampsIssued: number;
            rewardsDelta: number;
          };
    }>;
  };
}

export interface ListTenantParams {
  query?: string;
  plan?: string;
  status?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

function createApiError(message: string, status: number): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null;
  const impersonation = loadImpersonation();

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const impersonationToken = opts.impersonationToken ?? impersonation?.token;
  if (impersonationToken) {
    headers['x-impersonation-token'] = impersonationToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  let json: (ApiOk<T> | ApiErr) | null = null;
  try {
    json = (await response.json()) as ApiOk<T> | ApiErr;
  } catch {
    throw createApiError(response.statusText || 'Request failed', response.status);
  }

  if (!response.ok || !json || json.ok === false) {
    const message = json && 'error' in json && json.error ? json.error : 'Request failed';
    throw createApiError(message, response.status);
  }

  const { ok, ...payload } = json;
  void ok;
  return payload as T;
}

export async function getMe(): Promise<{ userId: string | null; email: string | null }> {
  const data = await apiFetch<{ userId: string | null; email: string | null }>('/api/admin/me');
  return { userId: data.userId, email: data.email };
}

export async function listTenants(params: ListTenantParams = {}): Promise<{ items: Tenant[]; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params.query) search.set('query', params.query);
  if (params.plan) search.set('plan', params.plan);
  if (params.status) search.set('status', params.status);
  if (params.cursor) search.set('cursor', params.cursor);
  search.set('limit', String(params.limit ?? 50));

  const query = search.toString();
  return apiFetch<{ items: Tenant[]; nextCursor: string | null }>(`/api/admin/tenants${query ? `?${query}` : ''}`, {
    signal: params.signal,
  });
}

export async function getTenant(tenantKey: string): Promise<Tenant> {
  const data = await apiFetch<{ tenant: Tenant }>(`/api/admin/tenants/${tenantKey}`);
  return data.tenant;
}

export async function startImpersonation(customerMongoId: string, ttlMin?: number): Promise<Impersonation> {
  const data = await apiFetch<{ impersonation: Impersonation }>('/api/admin/impersonation/start', {
    method: 'POST',
    body: { customerId: customerMongoId, ...(ttlMin ? { ttlMin } : {}) },
  });
  return data.impersonation;
}

export async function stopImpersonation(token: string): Promise<void> {
  await apiFetch('/api/admin/impersonation/stop', {
    method: 'POST',
    body: { token },
  });
}


export async function getKpiOverview(rangeDays = 30, signal?: AbortSignal): Promise<KpiOverviewResponse> {
  const search = new URLSearchParams();
  search.set('rangeDays', String(rangeDays));
  return apiFetch<KpiOverviewResponse>(`/api/admin/kpis/overview?${search.toString()}`, { signal });
}

export async function getKpiTimeseries(rangeDays = 30, signal?: AbortSignal): Promise<KpiTimeseriesResponse> {
  const search = new URLSearchParams();
  search.set('rangeDays', String(rangeDays));
  return apiFetch<KpiTimeseriesResponse>(`/api/admin/kpis/timeseries?${search.toString()}`, { signal });
}

export async function getActiveImpersonation(token: string): Promise<{
  active: boolean;
  targetCustomerId: string;
  targetMerchantId: string;
  expiresAt: string;
}> {
  return apiFetch('/api/admin/impersonation/active', {
    impersonationToken: token,
  });
}
