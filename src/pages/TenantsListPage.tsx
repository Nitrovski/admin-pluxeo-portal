import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, Tenant } from '../lib/adminApi';
import { formatNumber } from '../lib/formatNumber';

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export function TenantsListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Tenant[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query);
  const filters = useMemo(() => ({ query: debouncedQuery, plan, status }), [debouncedQuery, plan, status]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listTenants({ ...filters, limit: 50, signal: controller.signal })
      .then((res) => {
        setItems(res.items);
        setNextCursor(res.nextCursor ?? null);
      })
      .catch((e: { message?: string }) => {
        if (!controller.signal.aborted) {
          setError(e.message || 'Failed to load tenants');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;

    setLoadingMore(true);
    try {
      const res = await listTenants({ ...filters, limit: 50, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor ?? null);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Failed to load more tenants';
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <h1>Tenants</h1>
      <div className="filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tenants" />
        <input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Filter by plan" />
        <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Filter by status" />
      </div>

      {loading && <p>Loading tenants…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No tenants found.</p>}

      {!loading && !error && items.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>merchantId</th>
                <th>plan</th>
                <th>subscriptionStatus</th>
                <th>cardsCount</th>
                <th>events7d</th>
                <th>lastActivity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tenant, index) => {
                const tenantKey = tenant.customerMongoId || tenant.customerId;
                return (
                  <tr
                    key={tenant.customerMongoId || tenant.customerId || String(index)}
                    onClick={() => tenantKey && navigate(`/tenants/${tenantKey}`)}
                    style={{
                      opacity: tenantKey ? 1 : 0.6,
                      cursor: tenantKey ? 'pointer' : 'default',
                    }}
                  >
                    <td>{tenant.name || '—'}</td>
                    <td>{tenant.merchantId || '—'}</td>
                    <td>{tenant.plan || '—'}</td>
                    <td>{tenant.subscriptionStatus || '—'}</td>
                    <td>{formatNumber(tenant.cardsCount)}</td>
                    <td>{formatNumber(tenant.events7d)}</td>
                    <td>{tenant.lastActivity ? new Date(tenant.lastActivity).toLocaleString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {nextCursor && (
            <div style={{ marginTop: 12 }}>
              <button onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
