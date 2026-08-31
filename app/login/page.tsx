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

      // 2FA check: if enabled, verifica dispositivo confiável antes de exigir TOTP
      try{
        const fn = httpsCallable(getFunctions(getFirebaseApp()), 'getTwoFactorStatus');
        const res: any = await fn({});
        if(res.data?.enabled){
          // Tenta validar dispositivo confiável via cookie HttpOnly (backend decide)
          try{
            const idToken = await credential.user.getIdToken();
            const vRes = await fetch('/api/trusted-device/validate', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}` },
              credentials: 'include',
            });
            const vData: any = await vRes.json().catch(()=>({}));
            if(vData?.trusted){
              // Dispositivo confiável válido -> libera acesso sem TOTP
              const next = new URLSearchParams(window.location.search).get('next');
              const isSafePath = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('://') && !next.includes('\\');
              const target = isSafePath ? next : '/app/dashboard';
              window.location.href = target;
              return;
            }
          }catch{ /* falha na validação -> exige TOTP */ }
          const chFn = httpsCallable(getFunctions(getFirebaseApp()), 'createTotpChallenge');
          const ch: any = await chFn({});
          sessionStorage.setItem('totp_challenge', ch.data.challengeId);
          window.location.href = '/2fa';
          return;
        }
      }catch{ /* if status fails, proceed normal */ }

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
            <button className="login-social-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              Discord
            </button>
            <button className="login-social-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#9146FF"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
              Twitch
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
