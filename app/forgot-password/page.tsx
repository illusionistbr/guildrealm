'use client';

import { ArrowLeft, Clock, Mail, RefreshCw, Send, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getFirebaseApp } from '@/lib/admin/firebase/client';

const tipIcons = [Mail, Clock, Mail, RefreshCw] as const;

type Tip = { title: string; text: string };

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword');
  const tips = t.raw('tips') as Tip[];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Digite um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(getFirebaseApp()), 'sendPasswordResetEmail');
      await fn({ email: email.trim() });
      setSuccess('Enviamos um link de redefinição de senha para o seu e-mail.');
    } catch (err: unknown) {
      const code = ((err as { code?: string })?.code ?? '').replace('functions/', '');
      setError(code === 'signup-rate-limited'
        ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
        : 'Erro ao enviar. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

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

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle2 size={16} className="shrink-0" /> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label>
                <b>{t('emailLabel')}</b>
                <div className="input">
                  <Mail /><input type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
              </label>
              <PrimaryButton className="forgot-submit" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send />}
                {loading ? 'Enviando...' : t('submit')}
              </PrimaryButton>
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