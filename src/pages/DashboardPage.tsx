import { useEffect, useState } from 'react';
import { getKpiOverview, getKpiTimeseries, KpiOverviewResponse, KpiTimeseriesResponse } from '../lib/adminApi';
import { formatNumber } from '../lib/formatNumber';

const RANGE_OPTIONS = [7, 30, 90];

interface DashboardData {
  overview: KpiOverviewResponse;
  timeseries: KpiTimeseriesResponse;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function DashboardPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([getKpiOverview(rangeDays, controller.signal), getKpiTimeseries(rangeDays, controller.signal)])
      .then(([overview, timeseries]) => {
        setData({ overview, timeseries });
      })
      .catch((e: { message?: string }) => {
        if (!controller.signal.aborted) {
          setError(e.message || 'Failed to load dashboard data');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [rangeDays]);

  const totals = data?.overview.totals;
  const byDay = data?.timeseries.series.byDay ?? [];

  const totalsEvents = totals && typeof totals.events === 'object' && totals.events !== null ? totals.events : undefined;
  const totalEventsCount = totals && typeof totals.events === 'number' ? totals.events : undefined;

  return (
    <div>
      <div className="header-row">
        <h1>Dashboard</h1>
        <div className="actions">
          {RANGE_OPTIONS.map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={rangeDays === days ? 'range-button active' : 'range-button'}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {loading && !data && <p>Loading dashboard…</p>}
      {error && !data && <p className="error">{error}</p>}
      {error && data && <p style={{ marginBottom: 12, color: '#92400e' }}>Last refresh failed: {error}</p>}

      {totals && (
        <section className="kpi-grid" style={{ opacity: loading ? 0.7 : 1 }}>
          <article className="card"><h3>Total tenants</h3><p>{formatNumber(totals.totalTenants)}</p></article>
          <article className="card"><h3>Active subscriptions</h3><p>{formatNumber(totals.activeSubscriptions)}</p></article>
          <article className="card"><h3>Total cards</h3><p>{formatNumber(totals.totalCards)}</p></article>
          <article className="card"><h3>New cards (range)</h3><p>{formatNumber(totals.newCards)}</p></article>
          <article className="card"><h3>Events (range)</h3><p>{formatNumber(totalEventsCount)}</p></article>
          <article className="card"><h3>Stamps issued (range)</h3><p>{formatNumber(totalsEvents?.stampsIssued)}</p></article>
          <article className="card"><h3>Rewards delta (range)</h3><p>{formatNumber(totalsEvents?.rewardsDelta)}</p></article>
          <article className="card"><h3>Points earned (range)</h3><p>{formatNumber(totalsEvents?.pointsEarned)}</p></article>
          <article className="card"><h3>Points redeemed (range)</h3><p>{formatNumber(totalsEvents?.pointsRedeemed)}</p></article>
          <article className="card"><h3>Last event at</h3><p>{formatDateTime(totals.lastEventAt)}</p></article>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Timeseries</h2>
        {byDay.length === 0 ? (
          <p>No timeseries data for selected range.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>New cards</th>
                <th>Events</th>
                <th>Stamps issued</th>
                <th>Rewards delta</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((row) => {
                const rowEvents = typeof row.events === 'object' && row.events !== null ? row.events : undefined;
                const rowEventsCount = typeof row.events === 'number' ? row.events : undefined;

                return (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{formatNumber(row.newCards)}</td>
                    <td>{formatNumber(rowEventsCount)}</td>
                    <td>{formatNumber(rowEvents?.stampsIssued)}</td>
                    <td>{formatNumber(rowEvents?.rewardsDelta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
