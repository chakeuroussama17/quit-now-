import { useEffect, useState } from 'react';

import {
  getDailySmokeQuantities,
  getEmotionCounts,
  getHourDowMatrix,
  getTriggerCounts,
  getWinRate,
  type DayPoint,
  type KeyCount,
} from '@/db/statsRepo';
import { useLogsStore } from '@/state/useLogsStore';
import type { Emotion, TriggerType } from '@/types/models';

export interface StatsData {
  daily: DayPoint[];
  /** 7×24 heatmap counts and which source produced them. */
  heatmap: number[][];
  heatmapSource: 'smoke' | 'craving';
  triggers: KeyCount<TriggerType>[];
  emotions: KeyCount<Emotion>[];
  winRate: { resisted: number; total: number };
  loaded: boolean;
}

const EMPTY: StatsData = {
  daily: [],
  heatmap: [],
  heatmapSource: 'smoke',
  triggers: [],
  emotions: [],
  winRate: { resisted: 0, total: 0 },
  loaded: false,
};

/** Everything the stats screen renders, refreshed whenever a new log lands. */
export function useStatsData(rangeDays: number): StatsData {
  const todaySmokedCount = useLogsStore((s) => s.todaySmokedCount);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);
  const [data, setData] = useState<StatsData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [daily, smokeMatrix, triggers, emotions, winRate] = await Promise.all([
        getDailySmokeQuantities(rangeDays),
        getHourDowMatrix(rangeDays, 'smoke'),
        getTriggerCounts(rangeDays),
        getEmotionCounts(rangeDays),
        getWinRate(rangeDays),
      ]);
      // Clean cold-turkey users have no smoke logs — show when cravings hit instead.
      const smokeTotal = smokeMatrix.flat().reduce((a, b) => a + b, 0);
      const heatmap = smokeTotal > 0 ? smokeMatrix : await getHourDowMatrix(rangeDays, 'craving');
      if (cancelled) return;
      setData({
        daily,
        heatmap,
        heatmapSource: smokeTotal > 0 ? 'smoke' : 'craving',
        triggers,
        emotions,
        winRate,
        loaded: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeDays, todaySmokedCount, todayResisted]);

  return data;
}
