const STORAGE_KEY = 'pesatrack-theme';
export const THEME_EVENT = 'pesatrack-theme-change';

export const THEMES = {
  dark: { id: 'dark', label: 'Dark', themeColor: '#0B1220' },
  paper: { id: 'paper', label: 'Paper', themeColor: '#F7F5F0' },
};

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'paper' ? 'paper' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  const id = theme === 'paper' ? 'paper' : 'dark';
  const root = document.documentElement;
  root.classList.toggle('paper', id === 'paper');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', THEMES[id].themeColor);
  const metaScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaScheme) metaScheme.setAttribute('content', id === 'paper' ? 'light' : 'dark');

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: theme still applies for this session */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: id }));
  return id;
}