'use client';

import { ArrowLeft, Clock, Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const tipIcons = [Mail, Clock, Mail, RefreshCw] as const;

type Tip = { title: string; text: string };

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword');
  const tips = t.raw('tips') as Tip[];

  return (
    <main className="forgot-page">
      <SiteHeader />
      <div className="forgot-bg">
        <div className="forgot-bg-shade" />
        <div className="forgot-center">
          <a href="/login" className="forgot-back"><ArrowLeft size={16} /> {t('backLink')}</a>
          <div className="forgot-card">
            <span className="forgot-card-icon"><ShieldCheck size={40} /></span>
            <h2>{t('formTitle')}</h2>
            <p className="forgot-card-sub">{t('formText')}</p>
            <form>
              <label>
                <b>{t('emailLabel')}</b>
                <div className="input">
                  <Mail /><input type="text" placeholder={t('emailPlaceholder')} />
                </div>
              </label>
              <PrimaryButton className="forgot-submit"><Send /> {t('submit')}</PrimaryButton>
            </form>
            <p className="forgot-hint"><Clock size={14} /> {t('hint')}</p>
          </div>
        </div>
      </div>
      <div className="forgot-tips">
        <div className="forgot-tips-inner">
          <h3>{t('tipsTitle')}</h3>
          <p className="forgot-tips-sub">{t('tipsSub')}</p>
          <div className="forgot-tips-grid">
            {tips.map(({ title, text }, index) => {
              const Icon = tipIcons[index];
              return (
                <div className="forgot-tip" key={title}>
                  <span><Icon size={20} /></span>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
