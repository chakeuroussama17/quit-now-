import { create } from 'zustand';

import {
  getLastSmokeTimestamp,
  getTodaySummary,
  insertCravingLog,
  insertSmokeLog,
  updateSmokeLogDetail,
  type NewSmokeLog,
  type SmokeLogDetail,
} from '@/db/logsRepo';
import { invalidateContextCache } from '@/services/contextBuilder';

interface LogsState {
  todaySmokedCount: number;
  todaySmokedQuantity: number;
  todayCravingsResisted: number;
  lastSmokeAt: string | null;
  refresh: () => Promise<void>;
  logSmoke: (input: NewSmokeLog) => Promise<number>;
  addSmokeDetail: (id: number, detail: SmokeLogDetail) => Promise<void>;
  logResistedCraving: (
    intensity?: number | null,
    techniqueUsed?: string | null,
    durationSeconds?: number | null,
  ) => Promise<void>;
}

export const useLogsStore = create<LogsState>((set, get) => ({
  todaySmokedCount: 0,
  todaySmokedQuantity: 0,
  todayCravingsResisted: 0,
  lastSmokeAt: null,

  refresh: async () => {
    // Never let a transient DB error bubble into app startup (see useProfileStore).
    let today, lastSmokeAt;
    try {
      [today, lastSmokeAt] = await Promise.all([getTodaySummary(), getLastSmokeTimestamp()]);
    } catch (err) {
      console.error('[logs] refresh failed', err);
      return;
    }
    set({
      todaySmokedCount: today.smokedCount,
      todaySmokedQuantity: today.smokedQuantity,
      todayCravingsResisted: today.cravingsResisted,
      lastSmokeAt,
    });
  },

  logSmoke: async (input) => {
    const id = await insertSmokeLog(input);
    invalidateContextCache();
    await get().refresh();
    return id;
  },

  addSmokeDetail: async (id, detail) => {
    await updateSmokeLogDetail(id, detail);
  },

  logResistedCraving: async (intensity, techniqueUsed, durationSeconds) => {
    await insertCravingLog({
      resisted: true,
      intensity: intensity ?? null,
      techniqueUsed: techniqueUsed ?? null,
      durationSeconds: durationSeconds ?? null,
    });
    invalidateContextCache();
    await get().refresh();
  },
}));
