'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/admin/utils/cn';
import { Calendar, MapPin, Clock, Users, Swords, ChevronRight, Search } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const events = [
  {
    title: 'Torneio de Arena',
    date: 'Hoje',
    time: '20:00',
    location: 'Arena Central',
    players: 128,
    maxPlayers: 256,
    type: 'PvP',
    badge: 'bg-red-500/20 text-red-400',
    banner: 'from-red-600/10 to-rose-600/10',
    status: 'Inscrições abertas',
  },
  {
    title: 'Caça ao Tesouro',
    date: 'Amanhã',
    time: '15:00',
    location: 'Floresta Encantada',
    players: 64,
    maxPlayers: 100,
    type: 'PvE',
    badge: 'bg-green-500/20 text-green-400',
    banner: 'from-green-600/10 to-emerald-600/10',
    status: 'Inscrições abertas',
  },
  {
    title: 'Invasão Demoníaca',
    date: 'Sábado',
    time: '18:00',
    location: 'Portão do Abismo',
    players: 256,
    maxPlayers: 256,
    type: 'Raide',
    badge: 'bg-purple-500/20 text-purple-400',
    banner: 'from-purple-600/10 to-violet-600/10',
    status: 'Vagas esgotadas',
  },
  {
    title: 'Feira de Troca',
    date: 'Dom, 04 Ago',
    time: '10:00',
    location: 'Praça do Mercado',
    players: 42,
    maxPlayers: 200,
    type: 'Social',
    badge: 'bg-blue-500/20 text-blue-400',
    banner: 'from-blue-600/10 to-cyan-600/10',
    status: 'Inscrições abertas',
  },
];

export default function EventsPage() {
  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white">Eventos</h1>
        <p className="text-muted mt-1">Participe de eventos e ganhe recompensas exclusivas.</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Buscar eventos..." className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-4">
        {events.map((e) => (
          <div
            key={e.title}
            className={cn(
              'rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 hover:border-accent/30 transition-all duration-300',
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-heading font-bold text-white">{e.title}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', e.badge)}>{e.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted mt-2">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {e.date}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {e.time}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} /> {e.location}</span>
                  <span className="flex items-center gap-1"><Users size={14} /> {e.players}/{e.maxPlayers}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn(
                    'text-xs font-medium',
                    e.status === 'Vagas esgotadas' ? 'text-red-400' : 'text-green-400',
                  )}>
                    {e.status}
                  </p>
                  {e.status !== 'Vagas esgotadas' && (
                    <div className="mt-1 w-20 h-1.5 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(e.players / e.maxPlayers) * 100}%` }} />
                    </div>
                  )}
                </div>
                <button className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  e.status === 'Vagas esgotadas'
                    ? 'bg-[rgba(38,51,86,0.3)] text-muted cursor-not-allowed'
                    : 'bg-accent text-white hover:bg-accent-hover',
                )}>
                  {e.status === 'Vagas esgotadas' ? 'Lotado' : 'Participar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
