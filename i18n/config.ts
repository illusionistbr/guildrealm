export const locales = ['pt-BR', 'en', 'es', 'ko', 'ja', 'ru', 'zh'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'pt-BR';

export const localeOptions: Record<AppLocale, { label: string; countryCode: string }> = {
  'pt-BR': { label: 'Português (Brasil)', countryCode: 'BR' },
  en: { label: 'English', countryCode: 'US' },
  es: { label: 'Español', countryCode: 'ES' },
  ko: { label: '한국어', countryCode: 'KR' },
  ja: { label: '日本語', countryCode: 'JP' },
  ru: { label: 'Русский', countryCode: 'RU' },
  zh: { label: '中文', countryCode: 'CN' },
};
