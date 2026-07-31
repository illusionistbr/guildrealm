'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/admin/utils/cn';
import { Shield, Users, ChevronRight, Search, Filter, Swords } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const guilds = [
  { name: 'Dragões de Fogo', members: 128, rank: '#3', role: 'Líder', level: 42, badge: 'bg-red-500/20 text-red-400', banner: 'from-red-600/10 to-orange-600/10' },
  { name: 'Guardiões do Vale', members: 94, rank: '#12', role: 'Oficial', level: 38, badge: 'bg-blue-500/20 text-blue-400', banner: 'from-blue-600/10 to-cyan-600/10' },
  { name: 'Irmandade Noturna', members: 67, rank: '#28', role: 'Membro', level: 31, badge: 'bg-purple-500/20 text-purple-400', banner: 'from-purple-600/10 to-violet-600/10' },
  { name: 'Aliança Arcana', members: 156, rank: '#1', role: 'Membro', level: 45, badge: 'bg-yellow-500/20 text-yellow-400', banner: 'from-yellow-600/10 to-orange-600/10' },
];

export default function GuildsPage() {
  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white">Suas Guildas</h1>
        <p className="text-muted mt-1">Gerencie suas guildas e veja convites pendentes.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Buscar guildas..." className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <button className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted hover:text-white hover:border-accent/30 transition-all">
          <Filter size={16} /> Filtros
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guilds.map((g) => (
          <Link
            key={g.name}
            href="#"
            className={cn(
              'rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 hover:border-accent/30 transition-all duration-300 group',
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg', g.badge)}>
                  {g.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">{g.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted flex items-center gap-1"><Users size={12} /> {g.members}</span>
                    <span className="text-xs text-muted">{g.rank}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Nível</p>
                <p className="text-lg font-bold text-white font-heading">{g.level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                g.role === 'Líder' ? 'text-yellow-400 bg-yellow-400/10' :
                g.role === 'Oficial' ? 'text-accent bg-accent/10' :
                'text-muted bg-[rgba(38,51,86,0.3)]',
              )}>
                {g.role}
              </span>
              <span className="text-accent group-hover:translate-x-1 transition-transform"><ChevronRight size={18} /></span>
            </div>
          </Link>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
          <Swords size={20} className="text-accent" /> Convites Pendentes
        </h2>
        <div className="space-y-3">
          {[
            { name: 'Legião Sombria', members: 203, from: 'Thalos' },
            { name: 'Clã dos Lobos', members: 89, from: 'Lyra' },
          ].map((invite) => (
            <div key={invite.name} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[rgba(38,51,86,0.3)] flex items-center justify-center text-muted font-bold text-sm">
                  {invite.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{invite.name}</p>
                  <p className="text-xs text-muted">{invite.members} membros • Convite de {invite.from}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">Aceitar</button>
                <button className="px-3 py-1.5 text-xs rounded-lg border border-[rgba(38,51,86,0.5)] text-muted hover:text-white transition-colors">Recusar</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
