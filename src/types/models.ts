/** Core data model types. Mirrors the SQLite schema in src/db/database.ts. */

export type ProductType = 'cigarette' | 'vape' | 'rolled' | 'shisha';

export type QuitMode = 'cold_turkey' | 'gradual';

export type TriggerType =
  | 'stress'
  | 'habit'
  | 'social'
  | 'after_meal'
  | 'coffee'
  | 'boredom'
  | 'anxiety'
  | 'celebration'
  | 'withdrawal'
  | 'alcohol'
  | 'other';

export type Emotion =
  | 'stressed'
  | 'anxious'
  | 'bored'
  | 'relaxed'
  | 'guilty'
  | 'ashamed'
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'tired';

export type LocationTag = 'home' | 'work' | 'car' | 'social' | 'other';

/** Moments/situations where the user usually smokes most (onboarding Q5). */
export type UsageMoment =
  | 'morning_coffee'
  | 'after_meals'
  | 'work_breaks'
  | 'stress'
  | 'driving'
  | 'social'
  | 'drinking'
  | 'boredom'
  | 'before_sleep';

export type QuitReason =
  | 'health'
  | 'family'
  | 'kids'
  | 'money'
  | 'fitness'
  | 'pregnancy'
  | 'smell_appearance'
  | 'doctor'
  | 'self_control'
  | 'religious'
  | 'other';

export type RelapseCause =
  | 'stress'
  | 'social_pressure'
  | 'alcohol'
  | 'withdrawal'
  | 'big_life_event'
  | 'boredom'
  | 'just_one_moment'
  | 'weight_gain'
  | 'other';

export interface UserProfile {
  name: string;
  products: ProductType[];
  // Cigarettes / rolled tobacco
  cigsPerDay: number | null;
  pricePerPack: number | null;
  sticksPerPack: number | null;
  cigBrand: string | null;
  // Vape
  vapeNicotineMgMl: number | null;
  vapeMlPerDay: number | null;
  vapePodsPerWeek: number | null;
  vapeCostPerUnit: number | null;
  // Shisha
  shishaSessionsPerWeek: number | null;
  shishaCostPerSession: number | null;

  yearsUsing: number;
  quitReasons: QuitReason[];
  /** The user's own words about their deepest reason. Verbatim — fuel for every AI feature. */
  quitReasonText: string;
  usageMoments: UsageMoment[];
  quitMode: QuitMode;
  /** ISO date. Set for cold turkey; null for gradual (see programStartDate). */
  quitDate: string | null;
  /** ISO date the user completed onboarding / the program began. */
  programStartDate: string;
  triedBefore: boolean;
  previousRelapseCauses: RelapseCause[];
  previousRelapseText: string;
  currency: string;
  createdAt: string;
}

export interface SmokeLog {
  id: number;
  timestamp: string;
  productType: ProductType;
  /** Sticks for cigarettes/rolled, puffs for vape, sessions for shisha. */
  quantity: number;
  trigger: TriggerType | null;
  emotion: Emotion | null;
  cravingIntensity: number | null; // 1–10
  note: string | null;
  locationTag: LocationTag | null;
}

export interface CravingLog {
  id: number;
  timestamp: string;
  intensity: number | null; // 1–10
  resisted: boolean;
  techniqueUsed: string | null;
  durationSeconds: number | null;
}

export interface Achievement {
  id: number;
  key: string;
  unlockedAt: string;
}

export interface AiMessage {
  id: number;
  kind: 'daily_motivation' | 'post_log_reflection' | 'weekly_report' | 'pattern_nudge';
  content: string;
  createdAt: string;
  meta: string | null;
}
