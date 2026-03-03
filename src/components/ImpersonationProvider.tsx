import { createContext, PropsWithChildren, useContext } from 'react';
import { useImpersonation } from '../hooks/useImpersonation';

const ImpersonationContext = createContext<ReturnType<typeof useImpersonation> | null>(null);

export function ImpersonationProvider({ children }: PropsWithChildren) {
  const value = useImpersonation();
  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonationContext() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonationContext must be used within ImpersonationProvider');
  return ctx;
}
