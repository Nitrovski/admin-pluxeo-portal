import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTenant, startImpersonation, Tenant } from '../lib/adminApi';
import { ImpersonationState } from '../lib/impersonation';
import { useToast } from '../components/ToastProvider';
import { formatNumber } from '../lib/formatNumber';

interface Props {
  onSetImpersonation: (state: ImpersonationState) => void;
}

type MetricsObject = Partial<Record<'stampsIssued' | 'rewardsDelta' | 'pointsEarned' | 'pointsRedeemed', unknown>>;

function readMetricValue(value: unknown, metricKey: keyof MetricsObject): unknown {
  if (value && typeof value === 'object') {
    if (metricKey in value) {
      return (value as MetricsObject)[metricKey];
    }

    if (import.meta.env.DEV) {
      console.warn('[TenantDetailPage] metric object missing expected key', {
        requestedKey: metricKey,
        receivedKeys: Object.keys(value),
        value,
      });
    }

    return undefined;
  }

  return value;
}

export function TenantDetailPage({ onSetImpersonation }: Props) {
  const { customerId: tenantKey = '' } = useParams();
  const { pushToast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTenant(tenantKey)
      .then(setTenant)
      .catch((e: { message?: string }) => setError(e.message || 'Failed to load tenant'))
      .finally(() => setLoading(false));
  }, [tenantKey]);

  const handleImpersonate = async () => {
    if (!tenant?.customerMongoId) {
      pushToast('Missing customerMongoId for impersonation');
      return;
    }

    const res = await startImpersonation(tenant.customerMongoId);
    onSetImpersonation({
      token: res.token,
      targetCustomerId: res.targetCustomerId,
      targetMerchantId: res.targetMerchantId,
      expiresAt: res.expiresAt,
      tenantLabel: tenant.name || undefined,
    });
    pushToast('Impersonation enabled');
  };

  const handleCopyDebug = async () => {
    if (!tenant) return;
    const bundle = {
      ids: {
        customerId: tenant.customerId,
        customerMongoId: tenant.customerMongoId,
        merchantId: tenant.merchantId,
        stripeCustomerId: tenant.stripeCustomerId,
        stripeSubscriptionId: tenant.ids?.stripeSubscriptionId ?? null,
      },
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
      metrics: {
        cardsCount: tenant.cardsCount,
        events7d: tenant.events7d,
        events30d: tenant.events30d,
        lastActivity: tenant.lastActivity,
        newCards30d: tenant.newCards30d,
        stampsIssued30d: tenant.stampsIssued30d,
        rewardsDelta30d: tenant.rewardsDelta30d,
        pointsEarned30d: tenant.pointsEarned30d,
        pointsRedeemed30d: tenant.pointsRedeemed30d,
      },
    };
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    pushToast('Debug bundle copied');
  };

  if (loading) return <p>Loading tenant…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!tenant) return <p>Tenant not found.</p>;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/tenants">← Tenants</Link>
      </div>
      <div className="header-row">
        <div>
          <h1>{tenant.name || 'Unnamed tenant'}</h1>
          <p>{tenant.merchantId || '—'}</p>
        </div>
        <div className="actions">
          <button onClick={handleImpersonate}>Impersonate</button>
          <button onClick={handleCopyDebug}>Copy debug bundle</button>
        </div>
      </div>

      <section className="card">
        <h2>IDs</h2>
        <p>customerId: {tenant.customerId || '—'}</p>
        <p>customerMongoId: {tenant.customerMongoId || '—'}</p>
        <p>stripeCustomerId: {tenant.stripeCustomerId || '—'}</p>
        <p>stripeSubscriptionId: {tenant.ids?.stripeSubscriptionId || '—'}</p>
      </section>

      <section className="card">
        <h2>Metrics</h2>
        <p>cardsCount: {formatNumber(tenant.cardsCount)}</p>
        <p>events7d: {formatNumber(tenant.events7d)}</p>
        <p>events30d: {formatNumber(tenant.events30d)}</p>
        <p>lastActivity: {tenant.lastActivity ? new Date(tenant.lastActivity).toLocaleString() : '—'}</p>
      </section>

      <section className="card">
        <h2>Last 30 Days Metrics</h2>
        <p>New cards: {formatNumber(tenant.newCards30d)}</p>
        <p>Stamps issued: {formatNumber(readMetricValue(tenant.stampsIssued30d, 'stampsIssued'))}</p>
        <p>Rewards delta: {formatNumber(readMetricValue(tenant.rewardsDelta30d, 'rewardsDelta'))}</p>
        <p>Points earned: {formatNumber(readMetricValue(tenant.pointsEarned30d, 'pointsEarned'))}</p>
        <p>Points redeemed: {formatNumber(readMetricValue(tenant.pointsRedeemed30d, 'pointsRedeemed'))}</p>
      </section>
    </div>
  );
}
