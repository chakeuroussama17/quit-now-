import { useMemo } from 'react';

import { useSettingsStore } from '@/state/useSettingsStore';

import { en, type TKey } from './en';
import { ms } from './ms';

export type Lang = 'en' | 'ms';
export type { TKey };

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
];

export function getLang(): Lang {
  return useSettingsStore.getState().values['language'] === 'ms' ? 'ms' : 'en';
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let text = (lang === 'ms' ? ms[key] : undefined) ?? en[key];
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
  const lang: Lang = langValue === 'ms' ? 'ms' : 'en';
  return useMemo(() => (key, vars) => translate(lang, key, vars), [lang]);
}
