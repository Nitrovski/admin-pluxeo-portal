import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTenant, startImpersonation, Tenant } from '../lib/adminApi';
import { ImpersonationState } from '../lib/impersonation';
import { useToast } from '../components/ToastProvider';

interface Props {
  onSetImpersonation: (state: ImpersonationState) => void;
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
        <p>cardsCount: {tenant.cardsCount}</p>
        <p>events7d: {tenant.events7d}</p>
        <p>events30d: {tenant.events30d}</p>
        <p>lastActivity: {tenant.lastActivity ? new Date(tenant.lastActivity).toLocaleString() : '—'}</p>
      </section>

      <section className="card">
        <h2>Last 30 Days Metrics</h2>
        <p>New cards: {tenant.newCards30d}</p>
        <p>Stamps issued: {tenant.stampsIssued30d}</p>
        <p>Rewards delta: {tenant.rewardsDelta30d}</p>
        <p>Points earned: {tenant.pointsEarned30d}</p>
        <p>Points redeemed: {tenant.pointsRedeemed30d}</p>
      </section>
    </div>
  );
}
