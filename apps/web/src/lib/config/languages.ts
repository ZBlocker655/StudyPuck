export type SupportedLanguage = {
  code: string;
  label: string;
  nativeLabel?: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'zh', label: 'Chinese (Mandarin)', nativeLabel: '中文' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];

export function getLanguageByCode(code: string | undefined): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code);
}

export function replaceLanguageInPath(pathname: string, nextCode: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `/${nextCode}/`;
  }

  if (getLanguageByCode(segments[0])) {
    segments[0] = nextCode;
    return `/${segments.join('/')}`;
  }

  return `/${nextCode}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function getLanguageHomeHref(code: string): string {
  return `/${code}/`;
}
