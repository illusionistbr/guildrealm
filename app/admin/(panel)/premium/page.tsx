'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Crown, Plus, Check, Edit3 } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const plans = [
  {
    name: 'Aventureiro', price: 'Grátis', isFree: true, color: 'text-muted',
    features: ['Perfil de jogador', 'Entrar em guildas', 'Conquistas e rankings', 'Mensagens privadas'],
  },
  {
    name: 'Mestre de Guilda', price: 'R$ 19', isFree: false, color: 'text-accent', featured: true,
    features: ['Tudo do Aventureiro', 'Até 100 membros', 'Sistema DKP e loot', 'Eventos e calendário', 'Analytics de guilda'],
  },
  {
    name: 'Aliança', price: 'R$ 49', isFree: false, color: 'text-accent',
    features: ['Tudo do Mestre', 'Membros ilimitados', 'Gestão de alianças', 'Suporte prioritário', 'Personalização completa'],
  },
];

export default function PremiumPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Premium</h1>
            <p className="text-muted text-sm mt-1">Gerencie planos, benefícios e preços</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={18} />
            Novo Plano
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4 relative transition-all',
                plan.featured && 'border-accent/30 ring-1 ring-accent/20',
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-bold rounded-full">
                  MAIS POPULAR
                </span>
              )}
              <div className="flex items-center gap-3">
                <Crown size={24} className={plan.color} />
                <h3 className="text-white font-heading font-bold text-lg">{plan.name}</h3>
              </div>
              <p className="text-3xl font-heading font-bold text-white">{plan.price}{!plan.isFree && <span className="text-sm text-muted font-normal">/mês</span>}</p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 bg-[rgba(109,40,217,0.1)] hover:bg-[rgba(109,40,217,0.2)] text-accent rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Edit3 size={16} />
                Editar Plano
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
