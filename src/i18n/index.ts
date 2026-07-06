import { useMemo } from 'react';

import { useSettingsStore } from '@/state/useSettingsStore';

import { ar } from './ar';
import { en, type TKey } from './en';
import { fr } from './fr';
import { ms } from './ms';

export type Lang = 'en' | 'ms' | 'ar' | 'fr';
export type { TKey };

const DICTS: Record<Lang, Partial<Record<TKey, string>>> = { en, ms, ar, fr };

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

const LANG_CODES: Lang[] = ['en', 'ms', 'ar', 'fr'];

export function getLang(): Lang {
  const value = useSettingsStore.getState().values['language'];
  return LANG_CODES.includes(value as Lang) ? (value as Lang) : 'en';
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let text = DICTS[lang][key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Non-reactive translate — for services, notifications, copy pools. */
export function t(key: TKey, vars?: Record<string, string | number>): string {
  return translate(getLang(), key, vars);
}

export type TFunction = (key: TKey, vars?: Record<string, string | number>) => string;

/** Reactive translate — components re-render when the language changes. */
export function useT(): TFunction {
  const langValue = useSettingsStore((s) => s.values['language']);
  const lang: Lang = LANG_CODES.includes(langValue as Lang) ? (langValue as Lang) : 'en';
  return useMemo(() => (key, vars) => translate(lang, key, vars), [lang]);
}

/** Pick a per-language pool with English fallback (for copy arrays). */
export function pickPool<T>(pools: Partial<Record<Lang, T>> & { en: T }, lang = getLang()): T {
  return pools[lang] ?? pools.en;
}
