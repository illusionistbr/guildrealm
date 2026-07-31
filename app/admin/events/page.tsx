'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Calendar, Plus, Search, Edit3, Trash2, Users, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const events = [
  { id: '1', name: 'Torneio PvP Global', type: 'Competitivo', date: '15/08/2026', registrations: 234, limit: 500, status: 'upcoming' },
  { id: '2', name: 'Raid Colaborativa', type: 'PvE', date: '22/08/2026', registrations: 89, limit: 100, status: 'upcoming' },
  { id: '3', name: 'Festival da Guilda', type: 'Social', date: '01/09/2026', registrations: 456, limit: 1000, status: 'open' },
  { id: '4', name: 'Maratona de Nivelamento', type: 'Progressão', date: '10/07/2026', registrations: 1200, limit: 0, status: 'ended' },
];

export default function EventsPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Eventos</h1>
            <p className="text-muted text-sm mt-1">Gerencie eventos e calendário da plataforma</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={18} />
            Novo Evento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 space-y-3 hover:border-[rgba(168,100,255,0.3)] transition-colors">
              <div className="flex items-center justify-between">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                  'bg-emerald-500/10 text-emerald-400': event.status === 'open',
                  'bg-blue-500/10 text-blue-400': event.status === 'upcoming',
                  'bg-muted/10 text-muted': event.status === 'ended',
                })}>
                  {event.status === 'open' ? 'Inscrições Abertas' : event.status === 'upcoming' ? 'Em Breve' : 'Encerrado'}
                </span>
                <span className="text-xs text-muted">{event.type}</span>
              </div>
              <h3 className="text-white font-medium text-sm">{event.name}</h3>
              <div className="flex items-center gap-2 text-muted text-xs">
                <Clock size={14} />
                {event.date}
              </div>
              <div className="flex items-center gap-2 text-muted text-xs">
                <Users size={14} />
                {event.registrations}/{event.limit || '∞'} inscrições
              </div>
              <div className="flex gap-2 pt-2 border-t border-[rgba(38,51,86,0.3)]">
                <button className="flex-1 px-3 py-1.5 bg-[rgba(109,40,217,0.1)] text-accent text-xs rounded-lg hover:bg-[rgba(109,40,217,0.2)] transition-colors">Editar</button>
                <button className="px-3 py-1.5 text-muted text-xs hover:text-red-400 transition-colors">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
