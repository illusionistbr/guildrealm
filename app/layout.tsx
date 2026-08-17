import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClanForge — Seu reino. Sua guilda. Sua lenda.',
  description: 'A plataforma definitiva para guildas de MMORPG.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} translate="no">
      <body><NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider></body>
    </html>
  );
}
