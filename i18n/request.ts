import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, type AppLocale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : defaultLocale;

  const englishMessages = (await import('../messages/en.json')).default;
  const localeMessages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: {
      ...englishMessages,
      ...localeMessages,
      Header: { ...englishMessages.Header, ...localeMessages.Header },
      Home: { ...englishMessages.Home, ...localeMessages.Home },
      Guilds: { ...englishMessages.Guilds, ...localeMessages.Guilds },
      Signup: { ...englishMessages.Signup, ...localeMessages.Signup },
      Terms: { ...englishMessages.Terms, ...localeMessages.Terms },
      Privacy: { ...englishMessages.Privacy, ...localeMessages.Privacy },
      Login: { ...englishMessages.Login, ...localeMessages.Login },
      ForgotPassword: {
        ...englishMessages.ForgotPassword,
        ...localeMessages.ForgotPassword,
      },
      Dashboard: { ...englishMessages.Dashboard, ...localeMessages.Dashboard },
      CharacterCreate: {
        ...englishMessages.CharacterCreate,
        ...localeMessages.CharacterCreate,
      },
      GuildCreate: {
        ...englishMessages.GuildCreate,
        ...localeMessages.GuildCreate,
      },
      Promotions: { ...englishMessages.Promotions, ...localeMessages.Promotions },
      Loot: { ...englishMessages.Loot, ...localeMessages.Loot },
      GuildPanel: { ...englishMessages.GuildPanel, ...localeMessages.GuildPanel },
      GuildCalendar: { ...englishMessages.GuildCalendar, ...localeMessages.GuildCalendar },
      GuildGroups: { ...englishMessages.GuildGroups, ...localeMessages.GuildGroups },
      Recruitment: { ...englishMessages.Recruitment, ...localeMessages.Recruitment },
    },
  };
});
