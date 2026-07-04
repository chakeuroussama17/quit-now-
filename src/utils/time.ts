export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

export function durationParts(ms: number): DurationParts {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/** "3d 14h" once past a day, "14h 32m" before that, "32m" in the first hour. */
export function formatDuration(ms: number): string {
  const { days, hours, minutes } = durationParts(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export type DayPart = 'night' | 'morning' | 'afternoon' | 'evening';

export function dayPart(): DayPart {
  const hour = new Date().getHours();
  return hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  return Math.max(0, (to.getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function addDaysIso(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Whole years between a date of birth and now. */
export function ageFromDob(dobIso: string, at: Date = new Date()): number {
  const dob = new Date(dobIso);
  let age = at.getFullYear() - dob.getFullYear();
  const monthDiff = at.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < dob.getDate())) age -= 1;
  return age;
}
