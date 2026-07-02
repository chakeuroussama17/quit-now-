import { useEffect } from 'react';

import { generateReductionPlan } from '@/services/aiService';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { UserProfile } from '@/types/models';

/**
 * Gradual mode: lazily ask the coach for a personalized tapering plan the
 * first time the dashboard loads. Until it exists (or if the AI is
 * unreachable) every target silently uses the linear fallback taper.
 */
export function useEnsureReductionPlan(profile: UserProfile): void {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hasPlan = useSettingsStore((s) => s.values['reduction_plan'] != null);

  useEffect(() => {
    if (profile.quitMode !== 'gradual' || !hydrated || hasPlan) return;
    // Fire and forget — generateReductionPlan stores the plan in settings.
    generateReductionPlan(profile);
  }, [profile, hydrated, hasPlan]);
}
