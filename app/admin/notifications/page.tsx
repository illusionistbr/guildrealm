'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Bell, Plus, Send, Globe, Users, Crown, Gamepad2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  const sentNotifications = [
    { title: 'Nova conquista disponível!', audience: 'all', sent: '2h atrás', status: 'sent', opens: 1245 },
    { title: 'Atualização da plataforma', audience: 'premium', sent: '1d atrás', status: 'sent', opens: 876 },
    { title: 'Evento: Torneio PvP', audience: 'game', sent: '3d atrás', status: 'scheduled', opens: 0 },
  ];

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Notificações</h1>
            <p className="text-muted text-sm mt-1">Crie e gerencie notificações para os usuários</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
            <h3 className="text-white font-heading font-bold text-base">Nova Notificação</h3>
            <div>
              <label className="block text-xs text-muted mb-1.5">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação"
                className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conteúdo da notificação..."
                rows={3}
                className="w-full p-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Público-alvo</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'Todos', icon: Globe },
                  { id: 'premium', label: 'Premium', icon: Crown },
                  { id: 'game', label: 'Por Jogo', icon: Gamepad2 },
                  { id: 'guild', label: 'Por Guilda', icon: Users },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAudience(opt.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all',
                        audience === opt.id
                          ? 'bg-accent text-white'
                          : 'bg-[#050912] border border-[rgba(38,51,86,0.7)] text-muted hover:text-white',
                      )}
                    >
                      <Icon size={16} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Send size={18} />
              Enviar Notificação
            </button>
          </div>

          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
            <h3 className="text-white font-heading font-bold text-base">Últimas Notificações</h3>
            <div className="space-y-3">
              {sentNotifications.map((n) => (
                <div key={n.title} className="flex items-start gap-3 p-3 bg-[rgba(38,51,86,0.15)] rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Bell size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted">
                      Para: {n.audience} • {n.sent}
                    </p>
                    <p className="text-xs text-muted">
                      {n.status === 'sent' ? `${n.opens} aberturas` : 'Agendada'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
