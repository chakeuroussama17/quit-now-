import { Paywall } from '@/features/paywall/Paywall';
import { SosChat } from '@/features/sos/SosChat';
import { useAuthStore } from '@/state/useAuthStore';

export default function SosChatScreen() {
  const isPremium = useAuthStore((s) => s.isPremium);
  return isPremium ? <SosChat /> : <Paywall />;
}
