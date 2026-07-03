import { Paywall } from '@/features/paywall/Paywall';
import { RoomChat } from '@/features/room/RoomChat';
import { useAuthStore } from '@/state/useAuthStore';

export default function RoomScreen() {
  const isPremium = useAuthStore((s) => s.isPremium);
  return isPremium ? <RoomChat /> : <Paywall />;
}
