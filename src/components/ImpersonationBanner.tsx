import { stopImpersonation } from '../lib/adminApi';
import { ImpersonationState, isExpired } from '../lib/impersonation';
import { useToast } from './ToastProvider';

interface Props {
  impersonation: ImpersonationState | null;
  minutesLeft: number;
  onClear: () => void;
}

export function ImpersonationBanner({ impersonation, minutesLeft, onClear }: Props) {
  const { pushToast } = useToast();

  if (!impersonation || isExpired(impersonation)) {
    return null;
  }

  const handleStop = async () => {
    try {
      await stopImpersonation(impersonation.token);
    } catch {
      pushToast('Failed to stop impersonation remotely. Cleared locally.');
    } finally {
      onClear();
    }
  };

  return (
    <div className="impersonation-banner">
      <span>
        Impersonating: <strong>{impersonation.tenantLabel || impersonation.targetMerchantId}</strong> • Expires in {minutesLeft}m
      </span>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}
