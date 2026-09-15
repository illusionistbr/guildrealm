'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/admin/firebase/client';
import { getDiscordRedirectUri, takeDiscordVerifier } from '@/lib/auth/discord';

const ERROR_MESSAGES: Record<string, string> = {
  'exchange-failed': 'Não foi possível validar o login no Discord. Tente novamente.',
  'profile-failed': 'Não foi possível ler seu perfil do Discord. Tente novamente.',
  'missing-params': 'Sessão do Discord expirada. Volte e tente de novo.',
  'server-misconfigured': 'Login com Discord indisponível no momento.',
};

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading message="Conectando com o Discord..." />}>
      <DiscordCallback />
    </Suspense>
  );
}

function CallbackLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#050912] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="text-accent animate-spin" />
        <p className="text-muted text-sm">{message}</p>
      </div>
    </div>
  );
}

function DiscordCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      const discordError = searchParams.get('error');
      if (discordError) {
        setError('Login com Discord cancelado.');
        return;
      }
      const code = searchParams.get('code');
      const verifier = takeDiscordVerifier();
      if (!code || !verifier) {
        setError(ERROR_MESSAGES['missing-params']!);
        return;
      }
      try {
        const res = await fetch('/api/auth/discord/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, verifier, redirectUri: getDiscordRedirectUri() }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          customToken?: string;
          displayName?: string;
          photoURL?: string | null;
          isNew?: boolean;
          error?: string;
        };
        if (!res.ok || !body.customToken) {
          setError(ERROR_MESSAGES[body.error ?? ''] ?? 'Erro ao entrar com Discord.');
          return;
        }
        const credential = await signInWithCustomToken(getFirebaseAuth(), body.customToken);
        // Conta nova: cria o perfil (nickname, xp, plano) como no cadastro.
        if (body.isNew) {
          try {
            const fn = httpsCallable(getFunctions(getFirebaseApp()), 'createUserProfile');
            await fn({
              displayName: body.displayName ?? credential.user.displayName ?? 'Jogador',
              photoURL: body.photoURL ?? credential.user.photoURL ?? null,
            });
          } catch {
            // Perfil será criado no primeiro acesso ao app.
          }
        }
        if (!disposed) router.replace('/app/dashboard');
      } catch {
        if (!disposed) setError('Erro de conexão. Tente novamente.');
      }
    };
    run();
    return () => {
      disposed = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle size={28} className="text-red-400 mx-auto" />
          <p className="text-white font-medium">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => router.replace('/login')}
              className="px-4 h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Voltar ao login
            </button>
            <button
              onClick={() => router.replace('/signup')}
              className="px-4 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm hover:text-white transition-colors"
            >
              Criar conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <CallbackLoading message="Conectando com o Discord..." />;
}
