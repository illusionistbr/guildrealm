'use client';

import { Eye, EyeOff, Lock, LogIn, Mail, AlertCircle, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Turnstile } from '@/components/signup/Turnstile';
import { useState } from 'react';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/admin/firebase/client';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/invalid-login-credentials': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/user-disabled': 'Esta conta foi desativada. Contate o suporte.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
  'signup-turnstile-invalid': 'Falha na verificação de segurança. Tente novamente.',
};

export default function LoginPage() {
  const t = useTranslations('Login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

  const handleResend = async () => {
    setResending(true);
    setResendSuccess('');
    try {
      const fn = httpsCallable(getFunctions(getFirebaseApp()), 'sendVerificationEmail');
      await fn({});
      setResendSuccess('E-mail de confirmação reenviado! Verifique sua caixa de entrada.');
    } catch {
      setResendSuccess('Erro ao reenviar. Tente novamente em alguns minutos.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setResendSuccess('');
    setLoading(true);

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Resolva o desafio de segurança para continuar.');
      setLoading(false);
      return;
    }

    try {
      if (TURNSTILE_SITE_KEY) {
        const fn = httpsCallable(getFunctions(getFirebaseApp()), 'verifyLogin');
        await fn({ token: turnstileToken ?? '' });
      }

      const auth = getFirebaseAuth();
      await setPersistence(auth, stayLoggedIn ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!credential.user.emailVerified) {
        setWarning('Seu e-mail ainda não foi verificado. Confira sua caixa de entrada e confirme o link.');
        setLoading(false);
        return;
      }

      setTimeout(() => {
        const next = new URLSearchParams(window.location.search).get('next');
        const isSafePath = next
          && next.startsWith('/')
          && !next.startsWith('//')
          && !next.includes('://')
          && !next.includes('\\');
        const target = isSafePath ? next : '/app/dashboard';
        window.location.href = target;
      }, 300);
    } catch (err: unknown) {
      const code = ((err as { code?: string })?.code ?? '').replace('functions/', '');
      if (code === 'signup-turnstile-invalid') {
        setTurnstileNonce((n) => n + 1);
        setTurnstileToken(null);
      }
      setError(ERROR_MESSAGES[code] ?? 'Erro ao entrar. Tente novamente em instantes.');
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <SiteHeader />
      <div className="login-bg">
        <div className="login-bg-shade" />
        <div className="login-card">
          <h2>{t('formTitle')}</h2>
          <p className="login-card-sub">{t('formText')}</p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {warning && (
            <div className="login-warning">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" /> {warning}
              </div>
              <button type="button" className="login-resend-btn" onClick={handleResend} disabled={resending}>
                <Send size={14} />
                {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            </div>
          )}

          {resendSuccess && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <AlertCircle size={16} /> {resendSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>
              <b>{t('emailLabel')}</b>
              <div className="input">
                <Mail /><input type="text" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </label>
            <label>
              <b>{t('passwordLabel')}</b>
              <div className="input">
                <Lock /><input type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <a href="/forgot-password" className="login-forgot">{t('forgotPassword')}</a>
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-accent focus:ring-accent/50 cursor-pointer"
              />
              <span className="text-sm text-muted">{t('stayLoggedIn')}</span>
            </label>
            {TURNSTILE_SITE_KEY && (
              <div className="mb-4">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  resetNonce={turnstileNonce}
                />
              </div>
            )}
            <PrimaryButton className="login-submit" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn />}
              {t('submit')}
            </PrimaryButton>
          </form>
          <div className="login-divider"><span>{t('orContinue')}</span></div>
          <div className="login-socials">
            <button className="login-social-btn">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
          </div>
          <div className="login-signup-link">
            {t('noAccount')} <a href="/signup">{t('signupLink')}</a>
          </div>
        </div>
      </div>
    </main>
  );
}
