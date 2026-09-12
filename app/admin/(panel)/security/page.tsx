'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Shield, Key, Smartphone, Lock, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/admin/utils/cn';

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Segurança</h1>
          <p className="text-muted text-sm mt-1">Configure políticas de segurança da plataforma</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-5">
            <h3 className="text-white font-heading font-bold text-base flex items-center gap-2">
              <Smartphone size={18} className="text-accent" />
              Autenticação de Dois Fatores (2FA)
            </h3>
            <p className="text-sm text-muted">Proteja o painel administrativo com 2FA. Quando ativo, todos os admins precisarão configurar um autenticador.</p>
            <div className="flex items-center justify-between py-3 px-4 bg-[rgba(38,51,86,0.15)] rounded-lg">
              <span className="text-white text-sm">Exigir 2FA para todos os admins</span>
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  mfaEnabled ? 'bg-accent' : 'bg-[rgba(38,51,86,0.5)]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                  mfaEnabled ? 'translate-x-6' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          </div>

          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-5">
            <h3 className="text-white font-heading font-bold text-base flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              Sessões
            </h3>
            <div>
              <label className="block text-xs text-muted mb-1.5">Tempo máximo de sessão (minutos)</label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-[rgba(38,51,86,0.15)] rounded-lg">
              <div>
                <span className="text-white text-sm">Sessões ativas</span>
                <p className="text-xs text-muted mt-0.5">2 sessões ativas no momento</p>
              </div>
              <button className="text-xs text-red-400 hover:text-red-300">Revogar Todas</button>
            </div>
          </div>

          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-5">
            <h3 className="text-white font-heading font-bold text-base flex items-center gap-2">
              <Key size={18} className="text-accent" />
              Confirmação de Senha para Ações Críticas
            </h3>
            <p className="text-sm text-muted">Exigir confirmação de senha para ações sensíveis como exclusão de usuários, banimentos e alterações de permissões.</p>
            <div className="space-y-3">
              {[
                { label: 'Excluir usuários', enabled: true },
                { label: 'Banir usuários/guildas', enabled: true },
                { label: 'Alterar permissões', enabled: true },
                { label: 'Alterar configurações globais', enabled: false },
                { label: 'Transferir liderança', enabled: true },
              ].map((item) => (
                <label key={item.label} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted">{item.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked={item.enabled}
                    className="w-4 h-4 rounded border-muted bg-[#050912] text-accent focus:ring-accent"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-5">
            <h3 className="text-white font-heading font-bold text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent" />
              Rate Limiting & Proteções
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Login attempts', value: '5/min' },
                { label: 'API requests', value: '100/min' },
                { label: 'Login IP block', value: '15min' },
                { label: 'CSRF Protection', value: 'Ativo' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-[rgba(38,51,86,0.15)] rounded-lg">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className="text-white text-sm font-medium mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            <button className="w-full py-2.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm transition-colors">
              Salvar Configurações de Segurança
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
