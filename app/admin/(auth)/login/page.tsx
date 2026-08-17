'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { useAuthStore, buildAdminSession } from '@/lib/admin/rbac/store';
import type { AdminRole, Permission } from '@/lib/admin/rbac/roles';
import { getFirebaseAuth } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';

const ADMIN_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/invalid-login-credentials': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/user-disabled': 'Esta conta foi desativada. Contate o suporte.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);

      const idTokenResult = await credential.user.getIdTokenResult();
      const role = idTokenResult.claims.role as AdminRole | undefined;

      if (!role || !ADMIN_ROLES.includes(role)) {
        setError('Acesso negado. Esta conta não possui permissões administrativas.');
        setLoading(false);
        return;
      }

      const session = buildAdminSession({
        uid: credential.user.uid,
        email: credential.user.email ?? email.trim(),
        role,
        permissions: Array.isArray(idTokenResult.claims.permissions)
          ? (idTokenResult.claims.permissions as Permission[])
          : [],
        displayName: credential.user.displayName ?? undefined,
        photoURL: credential.user.photoURL ?? undefined,
      });

      // Set cookie for middleware (server-side auth check)
      document.cookie = `admin_session=${credential.user.uid}; path=/admin; max-age=86400; SameSite=Lax`;

      useAuthStore.getState().setSession(session);

      window.location.href = '/admin/dashboard';
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setError(ERROR_MESSAGES[code] ?? 'Erro ao fazer login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050912] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/images/guild-battle.png')] bg-cover bg-center opacity-[0.04]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050912]/60 to-[#050912]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-accent/30 bg-accent/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">ClanForge Admin</h1>
          <p className="text-muted text-sm mt-1">Painel administrativo — acesso restrito</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full h-11 px-4 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-4 pr-11 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full h-11 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all duration-200',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
