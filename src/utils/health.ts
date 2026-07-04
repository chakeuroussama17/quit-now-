/**
 * Physical recovery timeline after the last cigarette/vape, based on the
 * WHO / US Surgeon General benefits-of-quitting timeline. Hours are from the
 * quit moment (streak start).
 */
export interface HealthMilestone {
  /** Index into the i18n keys health.<id>.label / health.<id>.desc. */
  id: number;
  hours: number;
  label: string;
  description: string;
}

export const HEALTH_MILESTONES: HealthMilestone[] = [
  {
    id: 0,
    hours: 1 / 3,
    label: 'Heart rate drops',
    description: 'Within 20 minutes your heart rate and blood pressure fall back toward normal.',
  },
  {
    id: 1,
    hours: 12,
    label: 'Carbon monoxide cleared',
    description: 'CO levels in your blood return to normal — oxygen flows properly again.',
  },
  {
    id: 2,
    hours: 48,
    label: 'Taste & smell return',
    description: 'Nerve endings start regrowing. Food is about to get noticeably better.',
  },
  {
    id: 3,
    hours: 72,
    label: 'Breathing eases',
    description: 'Bronchial tubes relax; breathing feels lighter and energy picks up.',
  },
  {
    id: 4,
    hours: 14 * 24,
    label: 'Circulation improves',
    description: 'Between 2 and 12 weeks, circulation and lung function measurably improve.',
  },
  {
    id: 5,
    hours: 30 * 24,
    label: 'Lungs cleaning themselves',
    description: 'Coughing and shortness of breath decrease as lung cilia recover.',
  },
  {
    id: 6,
    hours: 9 * 30 * 24,
    label: 'Cilia rebuilt',
    description: 'By nine months, the lungs’ self-cleaning system is largely restored.',
  },
  {
    id: 7,
    hours: 365 * 24,
    label: 'Heart risk halved',
    description: 'One year in: your risk of coronary heart disease is half a smoker’s.',
  },
  {
    id: 8,
    hours: 5 * 365 * 24,
    label: 'Stroke risk normalized',
    description: 'Five years in: stroke risk has fallen to that of a non-smoker.',
  },
  {
    id: 9,
    hours: 10 * 365 * 24,
    label: 'Lung cancer risk halved',
    description: 'Ten years in: risk of dying from lung cancer is about half a smoker’s.',
  },
  {
    id: 10,
    hours: 15 * 365 * 24,
    label: 'A non-smoker’s heart',
    description: 'Fifteen years in: heart disease risk is the same as someone who never smoked.',
  },
];

export interface NextMilestone {
  milestone: HealthMilestone;
  hoursRemaining: number;
  /** 0–1 progress from the previous milestone to this one. */
  progress: number;
  reachedCount: number;
}

export function getNextMilestone(streakStartMs: number, nowMs = Date.now()): NextMilestone | null {
  const elapsedHours = Math.max(0, (nowMs - streakStartMs) / 3_600_000);
  const index = HEALTH_MILESTONES.findIndex((m) => m.hours > elapsedHours);
  if (index === -1) return null; // everything reached
  const next = HEALTH_MILESTONES[index];
  const prevHours = index === 0 ? 0 : HEALTH_MILESTONES[index - 1].hours;
  return {
    milestone: next,
    hoursRemaining: next.hours - elapsedHours,
    progress: (elapsedHours - prevHours) / (next.hours - prevHours),
    reachedCount: index,
  };
}

/** "in 14h" / "in 3d" / "in 25m" */
export function formatHoursRemaining(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Minutes of life regained — the standard 11 minutes per cigarette avoided. */
export function lifeRegainedMinutes(cigsAvoided: number): number {
  return Math.max(0, Math.round(cigsAvoided * 11));
}
