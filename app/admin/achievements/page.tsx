'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Trophy, Plus, Search, Edit3, Trash2, Star, Award, Filter } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const achievements: { id: string; name: string; category: string; xp: number; rarity: Rarity; active: boolean }[] = [
  { id: '1', name: 'Primeiro Passo', category: 'Progressão', xp: 100, rarity: 'common', active: true },
  { id: '2', name: 'Colecionador', category: 'Coleções', xp: 500, rarity: 'rare', active: true },
  { id: '3', name: 'Lenda Viva', category: 'Especial', xp: 5000, rarity: 'legendary', active: true },
  { id: '4', name: 'Mestre das Raids', category: 'PvE', xp: 2000, rarity: 'epic', active: false },
  { id: '5', name: 'Guerreiro Incansável', category: 'PvP', xp: 1500, rarity: 'rare', active: true },
];

const rarityConfig = {
  common: { label: 'Comum', class: 'bg-muted/10 text-muted' },
  rare: { label: 'Raro', class: 'bg-blue-500/10 text-blue-400' },
  epic: { label: 'Épico', class: 'bg-purple-500/10 text-purple-400' },
  legendary: { label: 'Lendário', class: 'bg-orange-500/10 text-orange-400' },
};

export default function AchievementsPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Conquistas</h1>
            <p className="text-muted text-sm mt-1">Gerencie conquistas, badges e recompensas</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={18} />
            Nova Conquista
          </button>
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(38,51,86,0.5)]">
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Conquista</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Categoria</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">XP</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Raridade</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Status</th>
                <th className="w-20 px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {achievements.map((ach) => (
                <tr key={ach.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Trophy size={16} className="text-accent" />
                      </div>
                      <span className="text-white text-sm font-medium">{ach.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted text-sm">{ach.category}</td>
                  <td className="px-5 py-4 text-white text-sm font-mono">{ach.xp.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', rarityConfig[ach.rarity].class)}>
                      {rarityConfig[ach.rarity].label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', ach.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted')}>
                      {ach.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button className="p-1.5 text-muted hover:text-accent transition-colors"><Edit3 size={15} /></button>
                      <button className="p-1.5 text-muted hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
