import { create } from 'zustand';

import type {
  ProductType,
  QuitMode,
  QuitReason,
  RelapseCause,
  UsageMoment,
  UserProfile,
} from '@/types/models';
import { addDaysIso } from '@/utils/time';

export interface OnboardingDraft {
  name: string;
  products: ProductType[];
  // Cigarettes / rolled tobacco
  cigsPerDay: number;
  pricePerPack: number;
  sticksPerPack: number;
  cigBrand: string;
  // Vape
  vapeNicotineMgMl: number;
  vapeAnswerMode: 'ml' | 'pods';
  vapeMlPerDay: number;
  vapePodsPerWeek: number;
  vapeCostPerUnit: number;
  // Shisha
  shishaSessionsPerWeek: number;
  shishaCostPerSession: number;

  yearsUsing: number;
  monthsUsing: number;

  quitReasons: QuitReason[];
  /** Their own words. Verbatim. The fuel for every AI feature. */
  quitReasonText: string;
  usageMoments: UsageMoment[];

  quitMode: QuitMode | null;
  quitDateOffsetDays: number;

  triedBefore: boolean | null;
  previousRelapseCauses: RelapseCause[];
  previousRelapseText: string;

  currency: string;
}

const initialDraft: OnboardingDraft = {
  name: '',
  products: [],
  cigsPerDay: 10,
  pricePerPack: 0,
  sticksPerPack: 20,
  cigBrand: '',
  vapeNicotineMgMl: 30,
  vapeAnswerMode: 'ml',
  vapeMlPerDay: 2,
  vapePodsPerWeek: 3,
  vapeCostPerUnit: 0,
  shishaSessionsPerWeek: 3,
  shishaCostPerSession: 0,
  yearsUsing: 1,
  monthsUsing: 0,
  quitReasons: [],
  quitReasonText: '',
  usageMoments: [],
  quitMode: null,
  quitDateOffsetDays: 0,
  triedBefore: null,
  previousRelapseCauses: [],
  previousRelapseText: '',
  currency: 'RM',
};

interface OnboardingState {
  draft: OnboardingDraft;
  patch: (partial: Partial<OnboardingDraft>) => void;
  toggleIn: <K extends 'products' | 'quitReasons' | 'usageMoments' | 'previousRelapseCauses'>(
    key: K,
    value: OnboardingDraft[K][number],
  ) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: initialDraft,

  patch: (partial) => set({ draft: { ...get().draft, ...partial } }),

  toggleIn: (key, value) => {
    const current = get().draft[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    set({ draft: { ...get().draft, [key]: next } });
  },

  reset: () => set({ draft: initialDraft }),
}));

/** Builds the persistent profile from the finished draft. */
export function draftToProfile(draft: OnboardingDraft): UserProfile {
  const now = new Date().toISOString();
  const usesCigs = draft.products.includes('cigarette') || draft.products.includes('rolled');
  const usesVape = draft.products.includes('vape');
  const usesShisha = draft.products.includes('shisha');

  return {
    name: draft.name.trim(),
    products: draft.products,
    cigsPerDay: usesCigs ? draft.cigsPerDay : null,
    pricePerPack: usesCigs ? draft.pricePerPack : null,
    sticksPerPack: usesCigs ? draft.sticksPerPack : null,
    cigBrand: usesCigs && draft.cigBrand.trim() ? draft.cigBrand.trim() : null,
    vapeNicotineMgMl: usesVape ? draft.vapeNicotineMgMl : null,
    vapeMlPerDay: usesVape && draft.vapeAnswerMode === 'ml' ? draft.vapeMlPerDay : null,
    vapePodsPerWeek: usesVape && draft.vapeAnswerMode === 'pods' ? draft.vapePodsPerWeek : null,
    vapeCostPerUnit: usesVape ? draft.vapeCostPerUnit : null,
    shishaSessionsPerWeek: usesShisha ? draft.shishaSessionsPerWeek : null,
    shishaCostPerSession: usesShisha ? draft.shishaCostPerSession : null,
    yearsUsing: draft.yearsUsing + draft.monthsUsing / 12,
    quitReasons: draft.quitReasons,
    quitReasonText: draft.quitReasonText.trim(),
    usageMoments: draft.usageMoments,
    quitMode: draft.quitMode ?? 'cold_turkey',
    quitDate: draft.quitMode === 'cold_turkey' ? addDaysIso(draft.quitDateOffsetDays) : null,
    programStartDate: now,
    triedBefore: draft.triedBefore === true,
    previousRelapseCauses: draft.previousRelapseCauses,
    previousRelapseText: draft.previousRelapseText.trim(),
    currency: draft.currency,
    createdAt: now,
  };
}
