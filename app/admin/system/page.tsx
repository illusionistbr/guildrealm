'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Server, Shield, Activity, Database, Cloud, RefreshCw, AlertTriangle, CheckCircle, Wifi } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const serviceStatus = [
  { name: 'Firebase Auth', status: 'operational', uptime: '99.99%', icon: Shield },
  { name: 'Firestore', status: 'operational', uptime: '99.97%', icon: Database },
  { name: 'Firebase Storage', status: 'operational', uptime: '99.95%', icon: Cloud },
  { name: 'Cloudflare CDN', status: 'operational', uptime: '100%', icon: Cloud },
  { name: 'API Server', status: 'operational', uptime: '99.92%', icon: Server },
  { name: 'Resend (Email)', status: 'operational', uptime: '99.99%', icon: Wifi },
];

export default function SystemPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Sistema</h1>
            <p className="text-muted text-sm mt-1">Status, desempenho e segurança da plataforma</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm transition-colors">
            <RefreshCw size={16} />
            Verificar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceStatus.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.name} className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Icon size={20} className="text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{service.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle size={12} />
                      {service.status === 'operational' ? 'Operacional' : 'Instável'}
                    </span>
                    <span className="text-xs text-muted">{service.uptime} uptime</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
            <h3 className="text-white font-heading font-bold text-base">Segurança</h3>
            <div className="space-y-3">
              {[
                { label: 'Firebase Security Rules', status: 'Ativas', ok: true },
                { label: 'Rate Limiting', status: 'Ativo', ok: true },
                { label: 'CSRF Protection', status: 'Ativo', ok: true },
                { label: '2FA (Admin)', status: 'Pendente', ok: false },
                { label: 'Audit Logging', status: 'Ativo', ok: true },
                { label: 'Session Management', status: 'Ativo', ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted">{item.label}</span>
                  <span className={cn('text-sm font-medium', item.ok ? 'text-emerald-400' : 'text-yellow-400')}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
            <h3 className="text-white font-heading font-bold text-base">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Tempo de Resposta', value: '124ms' },
                { label: 'Requisições/min', value: '2.341' },
                { label: 'Firestore Reads', value: '1.2M/dia' },
                { label: 'Firestore Writes', value: '89K/dia' },
                { label: 'CDN Hits', value: '94.2%' },
                { label: 'Erros 5xx', value: '0.02%' },
              ].map((metric) => (
                <div key={metric.label} className="p-3 bg-[rgba(38,51,86,0.15)] rounded-lg">
                  <p className="text-xs text-muted">{metric.label}</p>
                  <p className="text-white font-heading font-bold text-lg mt-1">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
