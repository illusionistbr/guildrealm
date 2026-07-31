'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/admin/utils/cn';
import { Trophy, Medal, Star, Lock, ChevronRight } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Rarity = 'legendary' | 'epic' | 'rare';

const categories: { title: string; items: { name: string; desc: string; progress: number; total: number; rarity: Rarity; unlocked: boolean }[] }[] = [
  {
    title: 'Combate',
    items: [
      { name: 'Guerreiro Lendário', desc: 'Vença 1000 batalhas PvP', progress: 750, total: 1000, rarity: 'legendary', unlocked: false },
      { name: 'Caçador de Sombras', desc: 'Derrote 50 chefes noturnos', progress: 50, total: 50, rarity: 'epic', unlocked: true },
      { name: 'Mestre das Armas', desc: 'Domine 10 armas diferentes', progress: 7, total: 10, rarity: 'rare', unlocked: false },
    ],
  },
  {
    title: 'Exploração',
    items: [
      { name: 'Cartógrafo', desc: 'Descubra 200 locais secretos', progress: 145, total: 200, rarity: 'epic', unlocked: false },
      { name: 'Aventureiro Curioso', desc: 'Complete 50 masmorras', progress: 50, total: 50, rarity: 'rare', unlocked: true },
      { name: 'Colecionador de Almas', desc: 'Capture 500 criaturas', progress: 225, total: 500, rarity: 'legendary', unlocked: false },
    ],
  },
  {
    title: 'Social',
    items: [
      { name: 'Amigo Leal', desc: 'Tenha 50 amigos online', progress: 47, total: 50, rarity: 'rare', unlocked: false },
      { name: 'Líder Nato', desc: 'Crie uma guilda nível 50', progress: 42, total: 50, rarity: 'epic', unlocked: false },
    ],
  },
];

const rarityConfig: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  legendary: { label: 'Lendário', color: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
  epic: { label: 'Épico', color: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  rare: { label: 'Raro', color: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
};

export default function AchievementsPage() {
  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white">Conquistas</h1>
        <p className="text-muted mt-1">Desbloqueie conquistas e mostre seu progresso.</p>
      </motion.div>

      {/* Stats summary */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Desbloqueadas', value: '18', icon: Trophy, color: 'text-accent' },
          { label: 'Em Progresso', value: '7', icon: Medal, color: 'text-yellow-400' },
          { label: 'Trancadas', value: '12', icon: Lock, color: 'text-muted' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4 text-center">
            <s.icon size={22} className={cn('mx-auto mb-2', s.color)} />
            <p className="text-2xl font-bold text-white font-heading">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Categories */}
      {categories.map((cat) => (
        <motion.div key={cat.title} variants={fadeUp} className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-white">{cat.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.items.map((a) => {
              const rc = rarityConfig[a.rarity];
              const pct = Math.round((a.progress / a.total) * 100);
              return (
                <div
                  key={a.name}
                  className={cn(
                    'rounded-xl border bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4 transition-all duration-300 hover:scale-[1.02]',
                    a.unlocked ? 'border-accent/30' : rc.border,
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      a.unlocked ? 'bg-accent/20' : 'bg-[rgba(38,51,86,0.3)]',
                    )}>
                      <Medal size={18} className={a.unlocked ? 'text-accent' : 'text-muted'} />
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', rc.color)}>
                      {rc.label}
                    </span>
                  </div>
                  <p className={cn('text-sm font-medium', a.unlocked ? 'text-white' : 'text-muted')}>{a.name}</p>
                  <p className="text-xs text-muted mt-1">{a.desc}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', rc.bg, 'opacity-60')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted shrink-0">{a.progress}/{a.total}</span>
                  </div>
                  {a.unlocked && (
                    <p className="text-[10px] text-accent mt-2 flex items-center gap-1">
                      <Star size={10} /> Desbloqueada
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
