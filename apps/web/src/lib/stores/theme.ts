import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

function resolveTheme(): Theme {
  if (!browser) {
    return 'light';
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (isTheme(stored)) {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (!browser) {
    return;
  }

  document.documentElement.setAttribute('data-theme', theme);
}

function createThemeStore() {
  const store = writable<Theme>('light');

  return {
    subscribe: store.subscribe,
    init() {
      const theme = resolveTheme();
      store.set(theme);
      applyTheme(theme);
    },
    set(theme: Theme) {
      store.set(theme);

      if (!browser) {
        return;
      }

      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    },
    toggle() {
      const nextTheme: Theme = get(store) === 'dark' ? 'light' : 'dark';
      this.set(nextTheme);
    },
  };
}

export const theme = createThemeStore();
