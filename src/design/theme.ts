/**
 * AppexQuant Markets Global - Theme System Manager
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export function getEffectiveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const effective = getEffectiveTheme(mode);
  const root = document.documentElement;

  root.classList.remove('dark', 'light');
  root.classList.add(effective);
  root.setAttribute('data-theme', effective);

  try {
    localStorage.setItem('appex_theme_mode_v1', mode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', effective === 'dark' ? '#0C0E12' : '#F4F5F7');
    }
    window.dispatchEvent(new CustomEvent('appex:theme-changed', { detail: { mode, effective } }));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
