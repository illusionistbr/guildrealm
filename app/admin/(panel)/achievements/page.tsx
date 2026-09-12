'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Trophy, Plus, Search } from 'lucide-react';
import { ACHIEVEMENTS, rarityLabel } from '@/lib/achievements/definitions';
import { cn } from '@/lib/admin/utils/cn';

const rarityConfig = {
  common: { label: 'Comum', class: 'bg-muted/10 text-muted' },
  rare: { label: 'Raro', class: 'bg-blue-500/10 text-blue-400' },
  epic: { label: 'Épico', class: 'bg-purple-500/10 text-purple-400' },
  legendary: { label: 'Lendário', class: 'bg-orange-500/10 text-orange-400' },
} as const;

export default function AchievementsPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Conquistas</h1>
            <p className="text-muted text-sm mt-1">
              {ACHIEVEMENTS.length} conquistas • 9 Comuns • 4 Raras • 4 Épicas • XP total:{' '}
              {ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0).toLocaleString('pt-BR')} • eventos via código do calendário
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={18} />
            Nova Conquista
          </button>
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[rgba(38,51,86,0.5)] flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Buscar conquista..."
                className="w-full h-9 pl-9 pr-3 bg-[#080f1e] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none"
              />
            </div>
            <span className="text-xs text-muted">Filtros por raridade em breve</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(38,51,86,0.5)]">
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Conquista</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Categoria</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">XP</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Gatilho</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Raridade</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {ACHIEVEMENTS.map((ach) => (
                <tr
                  key={ach.id}
                  className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Trophy size={16} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{ach.title}</p>
                        <p className="text-muted text-xs">{ach.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted text-sm">{ach.category}</td>
                  <td className="px-5 py-4 text-white text-sm font-mono">{ach.xp.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-4 text-muted text-xs font-mono">{ach.trigger}</td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', rarityConfig[ach.rarity].class)}>
                      {rarityLabel[ach.rarity]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white text-sm">{ach.threshold}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.4)] p-4 text-xs text-muted">
          💡 Tracking: <b>Participou de evento</b> = resgate do código no calendário (<code>confirmAttendance</code> → <code>guild_events/&#123;eventId&#125;/confirmations/&#123;uid&#125;</code>).<br />
          <b>Stream</b> = futuro detector Twitch/Kick/YouTube (<code>recordLivestream</code>). DKP e amigos via <code>recordDkpLoot</code>/<code>recordFriendAdded</code>.
        </div>
      </div>
    </AdminShell>
  );
}
