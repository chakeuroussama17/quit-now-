import type { UserProfile } from '@/types/models';

/**
 * Baseline consumption & cost helpers, derived from onboarding answers.
 * "Units" are sticks (cigarettes/rolled), ml (vape) or sessions (shisha)
 * of the user's primary product.
 */

export function primaryProduct(profile: UserProfile) {
  return profile.products[0] ?? 'cigarette';
}

/** Baseline units per day for the primary product. */
export function baselinePerDay(profile: UserProfile): number {
  switch (primaryProduct(profile)) {
    case 'cigarette':
    case 'rolled':
      return profile.cigsPerDay ?? 0;
    case 'vape':
      if (profile.vapeMlPerDay) return profile.vapeMlPerDay;
      // Rough pod ≈ 2 ml when the user answered in pods/week.
      if (profile.vapePodsPerWeek) return (profile.vapePodsPerWeek * 2) / 7;
      return 0;
    case 'shisha':
      return (profile.shishaSessionsPerWeek ?? 0) / 7;
  }
}

/** Cost of one unit (stick / ml / session) in the user's currency. */
export function costPerUnit(profile: UserProfile): number {
  switch (primaryProduct(profile)) {
    case 'cigarette':
    case 'rolled': {
      if (!profile.pricePerPack || !profile.sticksPerPack) return 0;
      return profile.pricePerPack / profile.sticksPerPack;
    }
    case 'vape': {
      if (!profile.vapeCostPerUnit) return 0;
      // Cost per ml, assuming a pod/bottle ≈ 2 ml unless they gave ml/day
      // with a bottle price — kept deliberately rough for Phase 1.
      return profile.vapeCostPerUnit / 2;
    }
    case 'shisha':
      return profile.shishaCostPerSession ?? 0;
  }
}

export function baselineDailyCost(profile: UserProfile): number {
  return baselinePerDay(profile) * costPerUnit(profile);
}

/**
 * Money saved = what the baseline would have cost since the program started,
 * minus what the logged consumption actually cost.
 */
export function moneySaved(profile: UserProfile, daysElapsed: number, unitsSmoked: number): number {
  const expected = baselinePerDay(profile) * daysElapsed;
  const avoided = Math.max(0, expected - unitsSmoked);
  return avoided * costPerUnit(profile);
}

/**
 * Phase 1 placeholder tapering target for gradual mode: linear reduction from
 * baseline to zero over 8 weeks. Phase 3 replaces this with the AI-generated,
 * adherence-aware plan.
 */
export function dailyTarget(profile: UserProfile, daysSinceStart: number): number {
  const baseline = baselinePerDay(profile);
  const week = Math.floor(daysSinceStart / 7);
  const target = Math.ceil(baseline * (1 - week / 8));
  return Math.max(0, target);
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(amount >= 100 ? 0 : 2)}`;
}
