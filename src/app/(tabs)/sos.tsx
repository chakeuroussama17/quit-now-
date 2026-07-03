import { Paywall } from '@/features/paywall/Paywall';
import { UrgeSurf } from '@/features/sos/UrgeSurf';
import { useAuthStore } from '@/state/useAuthStore';

export default function SosScreen() {
  const isPremium = useAuthStore((s) => s.isPremium);
  return isPremium ? <UrgeSurf /> : <Paywall />;
}
