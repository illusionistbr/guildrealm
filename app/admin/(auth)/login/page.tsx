'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { useAuthStore, loginTestAdmin } from '@/lib/admin/rbac/store';
import { cn } from '@/lib/admin/utils/cn';

const TEST_ACCOUNTS = [
  { email: 'admin@guildrealm.com', password: 'Admin@123', role: 'Super Admin' },
  { email: 'mod@guildrealm.com', password: 'Mod@123', role: 'Moderador' },
  { email: 'editor@guildrealm.com', password: 'Editor@123', role: 'Editor' },
];

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      const session = loginTestAdmin(email, password);

      if (!session) {
        setError('Credenciais inválidas.');
        setLoading(false);
        return;
      }

      // Set cookie for middleware (server-side auth check)
      document.cookie = `admin_session=${session.uid}; path=/admin; max-age=86400; SameSite=Lax`;

      setSession(session);

      // Force a small delay to ensure zustand persist writes to localStorage
      await new Promise((r) => setTimeout(r, 50));

      window.location.href = '/admin/dashboard';
    } catch {
      setError('Erro ao fazer login.');
      setLoading(false);
    }
  };

  const fillAccount = (acc: typeof TEST_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
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
          <h1 className="text-2xl font-heading font-bold text-white">GuildRealm Admin</h1>
          <p className="text-muted text-sm mt-1">Painel administrativo — modo teste</p>
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
              placeholder="admin@guildrealm.com"
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

        <div className="mt-6 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-2xl p-5 space-y-3">
          <p className="text-muted text-xs font-bold uppercase tracking-widest text-center mb-3">
            Contas de teste
          </p>
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              onClick={() => fillAccount(acc)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[rgba(38,51,86,0.2)] hover:bg-[rgba(109,40,217,0.1)] rounded-lg text-sm transition-colors"
            >
              <div className="text-left">
                <p className="text-white font-medium">{acc.email}</p>
                <p className="text-muted text-xs">{acc.password}</p>
              </div>
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
