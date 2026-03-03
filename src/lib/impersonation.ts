const IMPERSONATION_STORAGE_KEY = 'pluxeo.admin.impersonation';

export interface ImpersonationState {
  token: string;
  targetCustomerId: string;
  targetMerchantId: string;
  tenantLabel?: string;
  expiresAt: string;
}

export function loadImpersonation(): ImpersonationState | null {
  const raw = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    clearImpersonation();
    return null;
  }
}

export function saveImpersonation(state: ImpersonationState): void {
  localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(state));
}

export function clearImpersonation(): void {
  localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}

export function isExpired(state: ImpersonationState): boolean {
  return Date.parse(state.expiresAt) <= Date.now();
}
