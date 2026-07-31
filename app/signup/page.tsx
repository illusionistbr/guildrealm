'use client';

import { Check, EyeOff, Mail, ShieldCheck, Trophy, UserPlus, UsersRound, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const benefitIcons = [UsersRound, Trophy, ShieldCheck] as const;
const fieldIcons = [UsersRound, Mail, Mail, ShieldCheck, ShieldCheck] as const;

type SignupField = { label: string; placeholder: string; hint: string; isPassword: boolean };
type SignupBenefit = { title: string; text: string };

export default function Signup() {
  const t = useTranslations('Signup');
  const fields = t.raw('fields') as SignupField[];
  const benefits = t.raw('benefits') as SignupBenefit[];
  return (
    <main className="signup-page">
      <SiteHeader />
      <div className="signup-layout">
        <aside className="signup-aside">
          <div className="signup-aside-content">
            <p className="eyebrow"><ShieldCheck /> {t('asideEyebrow')}</p>
            <h1>{t('asideTitle1')}<br />{t('asideTitle2')} <em>{t('asideTitle3')}</em></h1>
            <p>{t('asideText')}</p>
            {benefits.map(({ title, text }, index) => {
              const Icon = benefitIcons[index];
              return (
                <div className="signup-benefit" key={title}>
                  <span><Icon /></span>
                  <div><b>{title}</b><p>{text}</p></div>
                </div>
              );
            })}
          </div>
          <div className="signup-aside-footer">
            <p>{t('loginText')} <a href="/login">{t('loginLink')}</a></p>
          </div>
        </aside>
        <section className="signup-form">
          <div className="signup-title">
            <span><UserPlus /></span>
            <div><h2>{t('formTitle')}</h2><p>{t('formText')}</p></div>
          </div>
          <form>
            <div className="signup-fields">
              {fields.map(({ label, placeholder, hint, isPassword }, index) => {
                const Icon = fieldIcons[index];
                const isNickname = index === 0;
                return (
                  <label key={label}>
                    <b className="flex items-center gap-1.5">
                      {label}
                      {isNickname && (
                        <span className="group relative inline-flex">
                          <AlertTriangle size={14} className="text-yellow-400 cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-[11px] text-yellow-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                            O nickname não poderá ser alterado depois.
                          </span>
                        </span>
                      )}
                    </b>
                    <div className="input">
                      <Icon /><input placeholder={placeholder} />{isPassword && <EyeOff />}
                    </div>
                    <small>{hint}</small>
                  </label>
                );
              })}
            </div>
            <div className="signup-checks">
              <label><input type="checkbox" defaultChecked /> {t.rich('checkboxTerms', { terms: (chunks) => <a href="/terms" target="_blank">{chunks}</a>, privacy: (chunks) => <a href="/privacy" target="_blank">{chunks}</a> })}</label>
              <label><input type="checkbox" /> {t('checkboxNews')}</label>
              <label><input type="checkbox" /> {t('checkboxAge')}</label>
            </div>
            <PrimaryButton className="signup-submit"><ShieldCheck /> {t('submit')}</PrimaryButton>
          </form>
        </section>
      </div>
    </main>
  );
}
