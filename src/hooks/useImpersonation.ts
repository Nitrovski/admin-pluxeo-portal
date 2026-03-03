import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveImpersonation } from '../lib/adminApi';
import {
  clearImpersonation as clearStoredImpersonation,
  ImpersonationState,
  isExpired,
  loadImpersonation,
  saveImpersonation,
} from '../lib/impersonation';

export function useImpersonation() {
  const [impersonation, setImpersonationState] = useState<ImpersonationState | null>(() => {
    const current = loadImpersonation();
    return current && !isExpired(current) ? current : null;
  });

  useEffect(() => {
    const current = loadImpersonation();
    if (!current) return;

    if (isExpired(current)) {
      clearStoredImpersonation();
      setImpersonationState(null);
      return;
    }

    getActiveImpersonation(current.token)
      .then((activeState) => {
        if (!activeState.active) {
          clearStoredImpersonation();
          setImpersonationState(null);
        }
      })
      .catch(() => {
        // Non-blocking best-effort validation. Keep local state when request fails.
      });
  }, []);

  const setImpersonation = useCallback((state: ImpersonationState) => {
    saveImpersonation(state);
    setImpersonationState(state);
  }, []);

  const clearImpersonation = useCallback(() => {
    clearStoredImpersonation();
    setImpersonationState(null);
  }, []);

  const minutesLeft = useMemo(() => {
    if (!impersonation) return 0;
    const diff = Date.parse(impersonation.expiresAt) - Date.now();
    return Math.max(0, Math.ceil(diff / 60000));
  }, [impersonation]);

  return { impersonation, setImpersonation, clearImpersonation, minutesLeft };
}
