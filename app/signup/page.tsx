'use client';

import { Eye, EyeOff, Mail, ShieldCheck, Trophy, UserPlus, UsersRound, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/admin/firebase/client';
import { Turnstile } from '@/components/signup/Turnstile';
import { DISCORD_CLIENT_ID, startDiscordOAuth } from '@/lib/auth/discord';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const benefitIcons = [UsersRound, Trophy, ShieldCheck] as const;
const fieldIcons = [UsersRound, Mail, Mail, ShieldCheck, ShieldCheck] as const;

type SignupField = { label: string; placeholder: string; hint: string; isPassword: boolean };
type SignupBenefit = { title: string; text: string };

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente fazer login.',
  'auth/invalid-email': 'E-mail inválido. Verifique o endereço digitado.',
  'auth/weak-password': 'Senha muito fraca. Use pelo menos 8 caracteres, com letras e números.',
  'auth/operation-not-allowed': 'O cadastro está temporariamente desativado. Ative o provedor E-mail/Senha no Firebase Console.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'signup-rate-limited': 'Muitas tentativas de cadastro neste dispositivo. Aguarde alguns minutos e tente novamente.',
  'signup-turnstile-invalid': 'Falha na verificação de segurança. Tente novamente.',
};

export default function Signup() {
  const t = useTranslations('Signup');
  const router = useRouter();
  const fields = t.raw('fields') as SignupField[];
  const benefits = t.raw('benefits') as SignupBenefit[];
  const [values, setValues] = useState<string[]>(fields.map(() => ''));
  const [showPasswords, setShowPasswords] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [acceptNews, setAcceptNews] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleDiscord = async () => {
    if (oauthLoading) return;
    setError('');
    setOauthLoading(true);
    try {
      await startDiscordOAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar cadastro com Discord.');
      setOauthLoading(false);
    }
  };

  const setValue = (index: number, value: string) => {
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const validate = (): string => {
    const [nickname, email, confirmEmail, password, confirmPassword] = values;
    if (nickname.trim().length < 3) return 'O nickname deve ter pelo menos 3 caracteres.';
    if (!/^[a-zA-Z0-9_\-]+$/.test(nickname.trim())) return 'O nickname só pode conter letras, números, _ e -.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Digite um e-mail válido.';
    if (email.trim() !== confirmEmail.trim()) return 'Os e-mails não conferem.';
    if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'A senha deve conter letras e números.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
    if (!acceptTerms) return 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.';
    if (!acceptAge) return 'Você precisa confirmar que tem mais de 13 anos.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Honeypot: campo oculto que humanos não veem. Se preenchido, é bot —
    // simula sucesso sem criar a conta (não revela a armadilha).
    if (honeypot.trim()) {
      setSuccess('Conta criada com sucesso! Enviamos um e-mail de confirmação. Redirecionando para o login...');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Resolva o desafio de segurança para continuar.');
      return;
    }

    setLoading(true);
    const [nickname, email, , password] = values;
    try {
      // Verificação server-side (rate limit + Turnstile) antes de criar a conta
      if (TURNSTILE_SITE_KEY) {
        const fn = httpsCallable(getFunctions(getFirebaseApp()), 'verifySignup');
        await fn({ token: turnstileToken ?? '', email: email.trim() });
      }
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);

      try {
        const fn = httpsCallable(getFunctions(getFirebaseApp()), 'createUserProfile');
        await fn({ displayName: nickname.trim() });
      } catch {
        // Falha no perfil não bloqueia o cadastro (conta já foi criada)
      }

      try {
        const fn = httpsCallable(getFunctions(getFirebaseApp()), 'sendVerificationEmail');
        await fn({});
      } catch {
        // Falha no envio de verificação não bloqueia o cadastro
      }

      setSuccess('Conta criada com sucesso! Enviamos um e-mail de confirmação. Redirecionando para o login...');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const code = ((err as { code?: string })?.code ?? '').replace('functions/', '');
      if (code === 'signup-turnstile-invalid') {
        setTurnstileNonce((n) => n + 1);
        setTurnstileToken(null);
      }
      setError(ERROR_MESSAGES[code] ?? 'Erro ao criar conta. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit} noValidate>
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="hp-website">Website</label>
              <input
                id="hp-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div className="signup-fields">
              {fields.map(({ label, placeholder, hint, isPassword }, index) => {
                const Icon = fieldIcons[index];
                const isNickname = index === 0;
                const isEmail = index === 1;
                const inputType = isPassword ? (showPasswords ? 'text' : 'password') : isEmail ? 'email' : 'text';
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
                      <Icon />
                      <input
                        type={inputType}
                        placeholder={placeholder}
                        value={values[index]}
                        onChange={(e) => setValue(index, e.target.value)}
                        disabled={loading}
                      />
                      {isPassword && (
                        <button type="button" className="toggle-pw" onClick={() => setShowPasswords(!showPasswords)}>
                          {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                    <small>{hint}</small>
                  </label>
                );
              })}
            </div>
            <div className="signup-checks">
              <label>
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} disabled={loading} />
                {t.rich('checkboxTerms', { terms: (chunks) => <a href="/terms" target="_blank">{chunks}</a>, privacy: (chunks) => <a href="/privacy" target="_blank">{chunks}</a> })}
              </label>
              <label>
                <input type="checkbox" checked={acceptNews} onChange={(e) => setAcceptNews(e.target.checked)} disabled={loading} />
                {t('checkboxNews')}
              </label>
              <label>
                <input type="checkbox" checked={acceptAge} onChange={(e) => setAcceptAge(e.target.checked)} disabled={loading} />
                {t('checkboxAge')}
              </label>
            </div>

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

            {TURNSTILE_SITE_KEY && (
              <div className="mb-4">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  resetNonce={turnstileNonce}
                />
              </div>
            )}

            <PrimaryButton className="signup-submit" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck />}
              {loading ? 'Criando conta...' : t('submit')}
            </PrimaryButton>
          </form>
          {DISCORD_CLIENT_ID && (
            <>
              <div className="login-divider"><span>ou</span></div>
              <div className="login-socials">
                <button className="login-social-btn" type="button" onClick={handleDiscord} disabled={oauthLoading}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Continuar com Discord
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
