'use client';

import { AdminShell } from '@/components/admin/admin-shell';

export default function DashboardPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Dashboard</h1>
            <p className="text-muted text-sm mt-1">Visão geral da plataforma ClanForge</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Última atualização: agora</span>
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
              Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Usuários Totais"
            value="24.891"
            change="+12%"
            trend="up"
          />
          <StatCard
            label="Usuários Online"
            value="1.247"
            change="+3%"
            trend="up"
          />
          <StatCard
            label="Guilds Ativas"
            value="3.452"
            change="+8%"
            trend="up"
          />
          <StatCard
            label="Receita Mensal"
            value="R$ 47.890"
            change="+22%"
            trend="up"
          />
          <StatCard
            label="Assinaturas Premium"
            value="2.134"
            change="+15%"
            trend="up"
          />
          <StatCard
            label="Denúncias Pendentes"
            value="23"
            change="-5%"
            trend="down"
          />
          <StatCard
            label="Eventos Ativos"
            value="12"
            change="0%"
            trend="neutral"
          />
          <StatCard
            label="Novos Hoje"
            value="89"
            change="+7%"
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentActivity />
          <QuickActions />
          <SystemHealth />
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, change, trend }: {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-muted',
  };

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 hover:border-[rgba(168,100,255,0.3)] transition-colors">
      <p className="text-muted text-xs font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-2xl font-heading font-bold text-white">{value}</span>
        <span className={`text-sm font-medium ${trendColors[trend]}`}>{change}</span>
      </div>
    </div>
  );
}

function RecentActivity() {
  const activities = [
    { user: 'João Silva', action: 'criou uma guilda', time: '2min atrás' },
    { user: 'Maria Souza', action: 'assinou Premium', time: '10min atrás' },
    { user: 'Carlos Lima', action: 'denunciou um usuário', time: '25min atrás' },
    { user: 'Ana Costa', action: 'completou conquista', time: '1h atrás' },
    { user: 'Pedro Rocha', action: 'editou perfil', time: '2h atrás' },
  ];

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5">
      <h3 className="text-white font-heading font-bold text-base mb-4">Atividades Recentes</h3>
      <div className="space-y-3">
        {activities.map((act, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(38,51,86,0.4)] last:border-0">
            <div>
              <span className="text-white text-sm font-medium">{act.user}</span>
              <span className="text-muted text-sm ml-1">{act.action}</span>
            </div>
            <span className="text-muted text-xs">{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Criar Usuário', href: '/admin/users' },
    { label: 'Nova Conquista', href: '/admin/achievements' },
    { label: 'Adicionar Jogo', href: '/admin/games' },
    { label: 'Notificação Global', href: '/admin/notifications' },
    { label: 'Ver Denúncias', href: '/admin/moderation' },
  ];

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5">
      <h3 className="text-white font-heading font-bold text-base mb-4">Ações Rápidas</h3>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[rgba(109,40,217,0.1)] text-sm text-muted hover:text-white transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SystemHealth() {
  const metrics = [
    { label: 'Uptime', value: '99.97%', status: 'healthy' },
    { label: 'Tempo médio de resposta', value: '124ms', status: 'healthy' },
    { label: 'Erros (última hora)', value: '0.02%', status: 'healthy' },
    { label: 'Firestore Reads', value: '1.2M/dia', status: 'warning' },
    { label: 'Armazenamento', value: '34.2 GB', status: 'healthy' },
  ];

  const statusColors = {
    healthy: 'text-emerald-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5">
      <h3 className="text-white font-heading font-bold text-base mb-4">Saúde do Sistema</h3>
      <div className="space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(38,51,86,0.4)] last:border-0">
            <span className="text-muted text-sm">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">{m.value}</span>
              <span className={`w-2 h-2 rounded-full ${statusColors[m.status as keyof typeof statusColors]}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
