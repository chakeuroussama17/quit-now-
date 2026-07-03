import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getAllCravingLogs, getAllSmokeLogs } from '@/db/logsRepo';

/**
 * CSV export via the system share sheet. One file, one row per event —
 * smoke logs and craving logs distinguished by the `type` column.
 * Room conversations are intentionally NOT exportable here; they stay private.
 */

function csvField(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportDataCsv(): Promise<void> {
  const [smokes, cravings] = await Promise.all([getAllSmokeLogs(), getAllCravingLogs()]);

  const header =
    'type,timestamp,product,quantity,trigger,emotion,intensity,resisted,technique,duration_seconds,location,note';
  const rows: string[] = [header];

  for (const s of smokes) {
    rows.push(
      [
        'smoke',
        s.timestamp,
        s.productType,
        s.quantity,
        s.trigger,
        s.emotion,
        s.cravingIntensity,
        '',
        '',
        '',
        s.locationTag,
        s.note,
      ]
        .map(csvField)
        .join(','),
    );
  }
  for (const c of cravings) {
    rows.push(
      [
        'craving',
        c.timestamp,
        '',
        '',
        '',
        '',
        c.intensity,
        c.resisted ? 1 : 0,
        c.techniqueUsed,
        c.durationSeconds,
        '',
        '',
      ]
        .map(csvField)
        .join(','),
    );
  }

  const path = `${FileSystem.cacheDirectory}exhale-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(path, rows.join('\n'));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Exhale data',
    });
  }
}
