'use client';

import { ChevronDown, Menu, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import ReactCountryFlag from 'react-country-flag';
import { useState } from 'react';
import { localeOptions, locales, type AppLocale } from '@/i18n/config';
import { useNavigationStore } from '@/lib/navigation-store';
import { navigationSchema } from '@/lib/schemas';
import { PrimaryButton } from '@/components/ui/primary-button';

export function SiteHeader() {
  const { menuOpen, toggleMenu, closeMenu } = useNavigationStore();
  const [languageOpen, setLanguageOpen] = useState(false);
  const locale = useLocale() as AppLocale;
  const t = useTranslations('Header');
  const navigationItems = navigationSchema.parse([
    { label: t('resources'), href: '/#recursos' },
    { label: t('games'), href: '/#jogos' },
    { label: t('prices'), href: '/#precos' },
    { label: t('blog'), href: '/#blog' },
  ]);
  const selectedLanguage = localeOptions[locale];

  function changeLanguage(nextLocale: AppLocale) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <header className="nav">
      <a href="/" className="brand" aria-label="ClanForge, início">
        <img src="/images/clanforge-logo.png" alt="ClanForge" width={140} height={36} className="h-8 w-auto object-contain" />
      </a>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
        {navigationItems.map((item) => <a key={item.label} href={item.href} onClick={closeMenu}>{item.label}</a>)}
      </nav>
      <div className="nav-actions">
        <div className="language-picker">
          <button className="locale" onClick={() => setLanguageOpen((open) => !open)} aria-expanded={languageOpen} aria-label={t('language')}>
            <ReactCountryFlag countryCode={selectedLanguage.countryCode} svg /> <span>{locale}</span> <ChevronDown size={14} />
          </button>
          {languageOpen && <div className="language-menu" role="menu">
            {locales.map((item) => <button key={item} role="menuitem" className={item === locale ? 'selected' : ''} onClick={() => changeLanguage(item)}><ReactCountryFlag countryCode={localeOptions[item].countryCode} svg /><span>{localeOptions[item].label}</span></button>)}
          </div>}
        </div>
        <button className="login" onClick={() => window.location.href = '/login'}>{t('signIn')}</button>
        <PrimaryButton className="account" href="/signup">{t('createAccount')}</PrimaryButton>
      </div>
      <button className="menu-button" onClick={toggleMenu} aria-label="Abrir menu">
        {menuOpen ? <X /> : <Menu />}
      </button>
    </header>
  );
}
