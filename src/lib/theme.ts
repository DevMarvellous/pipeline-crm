import { useEffect } from 'react';
import type { ThemePref } from '../types';
import { useSettings } from './store';

const DARK_META_COLOR = '#0f1012';
const LIGHT_META_COLOR = '#f4f4f5';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveDark(pref: ThemePref): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return systemPrefersDark();
}

function apply(pref: ThemePref): void {
  const dark = resolveDark(pref);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? DARK_META_COLOR : LIGHT_META_COLOR);
}

/** Keeps the <html> class and theme-color meta in sync with the theme setting. */
export function useThemeSync(): void {
  const { theme } = useSettings();
  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
}
