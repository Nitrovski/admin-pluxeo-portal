import { SignedIn, SignedOut, useAuth, useClerk } from '@clerk/clerk-react';
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { DashboardPage } from './pages/DashboardPage';
import { SignInPage } from './pages/SignInPage';
import { TenantsListPage } from './pages/TenantsListPage';
import { TenantDetailPage } from './pages/TenantDetailPage';
import { getMe, setTokenProvider } from './lib/adminApi';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { ImpersonationProvider, useImpersonationContext } from './components/ImpersonationProvider';

function ProtectedLayout() {
  const { getToken } = useAuth();
  const clerk = useClerk();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [denied, setDenied] = useState(false);
  const { impersonation, clearImpersonation, minutesLeft } = useImpersonationContext();
  const audience = (import.meta.env.VITE_ADMIN_CLERK_JWT_AUDIENCE as string | undefined)?.trim();

  useEffect(() => {
    setTokenProvider(() => {
      if (audience) {
        const tokenOptions = ({ audience } as unknown) as Parameters<typeof getToken>[0];
        return getToken(tokenOptions);
      }
      return getToken();
    });
  }, [audience, getToken]);

  useEffect(() => {
    let active = true;
    setReady(false);
    setDenied(false);
    setAllowed(false);

    getMe()
      .then(() => {
        if (!active) return;
        setAllowed(true);
      })
      .catch(async (err: { status?: number }) => {
        if (!active) return;
        if (err.status === 403) {
          setDenied(true);
          return;
        }
        if (err.status === 401) {
          await clerk.signOut();
        }
        setAllowed(false);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [clerk]);

  const paddingTop = useMemo(() => (impersonation ? 56 : 0), [impersonation]);

  if (!ready) return <div className="centered-page">Checking admin access…</div>;
  if (denied) return <AccessDeniedPage />;
  if (!allowed) return <Navigate to="/sign-in" replace />;

  return (
    <div style={{ paddingTop }}>
      <ImpersonationBanner impersonation={impersonation} minutesLeft={minutesLeft} onClear={clearImpersonation} />
      <main className="container">
        <nav className="top-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `top-nav-link${isActive ? ' active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/tenants" className={({ isActive }) => `top-nav-link${isActive ? ' active' : ''}`}>
            Tenants
          </NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}

function TenantDetailRoute() {
  const { setImpersonation } = useImpersonationContext();
  return <TenantDetailPage onSetImpersonation={setImpersonation} />;
}

function AuthBoundary() {
  return (
    <>
      <SignedOut>
        <Navigate to="/sign-in" replace />
      </SignedOut>
      <SignedIn>
        <Outlet />
      </SignedIn>
    </>
  );
}

export default function App() {
  return (
    <ImpersonationProvider>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<AuthBoundary />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tenants" element={<TenantsListPage />} />
            <Route path="/tenants/:customerId" element={<TenantDetailRoute />} />
          </Route>
        </Route>
      </Routes>
    </ImpersonationProvider>
  );
}
