'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/admin/utils/cn';
import {
  Shield,
  Trophy,
  Users,
  Zap,
  Star,
  Calendar,
  Activity,
  ChevronRight,
  Sword,
  Swords,
  Medal,
  TrendingUp,
  Plus,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function UserDashboard() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-8"
    >
      {/* Header */}
      <WelcomeSection />

      {/* Stats Grid */}
      <StatsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Guilds */}
        <div className="lg:col-span-2">
          <ActiveGuilds />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievement Progress */}
        <AchievementProgress />
        {/* Upcoming Events */}
        <UpcomingEvents />
      </div>
    </motion.div>
  );
}

function WelcomeSection() {
  return (
    <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
          Bem-vindo de volta, <span className="text-accent">Aventureiro</span>
        </h1>
        <p className="text-muted mt-1">Você tem 3 notificações não lidas e 2 convites de guildas.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 rounded-lg bg-[rgba(109,40,217,0.12)] border border-accent/20 flex items-center gap-2">
          <Zap size={16} className="text-accent" />
          <span className="text-white text-sm font-medium">XP Hoje: <span className="text-accent">+1,240</span></span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center gap-2">
          <Star size={16} className="text-yellow-400" />
          <span className="text-white text-sm font-medium">Streak: <span className="text-yellow-400">7 dias</span></span>
        </div>
      </div>
    </motion.div>
  );
}

function StatsGrid() {
  const stats = [
    { label: 'Nível', value: '42', icon: Zap, color: 'accent', sub: '2,340 / 5,000 XP' },
    { label: 'Guildas', value: '3', icon: Shield, color: 'accent', sub: '2 cargos de liderança' },
    { label: 'Conquistas', value: '18', icon: Trophy, color: 'yellow', sub: '5 de ouro • 7 de prata' },
    { label: 'Amigos', value: '47', icon: Users, color: 'accent', sub: '12 online agora' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          variants={fadeUp}
          className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)] p-5 hover:border-accent/30 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-3">
            <stat.icon
              size={22}
              className={stat.color === 'accent' ? 'text-accent' : 'text-yellow-400'}
            />
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              stat.color === 'accent' ? 'bg-accent/10 text-accent' : 'bg-yellow-400/10 text-yellow-400',
            )}>
              {stat.label}
            </span>
          </div>
          <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
          <p className="text-xs text-muted mt-1">{stat.sub}</p>
          {/* XP Bar for first stat */}
          {i === 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
                style={{ width: '46%' }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ActiveGuilds() {
  const guilds = [
    {
      name: 'Dragões de Fogo',
      members: 128,
      rank: '#3',
      role: 'Líder',
      banner: 'from-red-600/20 to-orange-600/20 border-red-500/20',
      iconBg: 'bg-red-500/20 text-red-400',
      progress: 85,
    },
    {
      name: 'Guardiões do Vale',
      members: 94,
      rank: '#12',
      role: 'Oficial',
      banner: 'from-blue-600/20 to-cyan-600/20 border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-400',
      progress: 62,
    },
    {
      name: 'Irmandade Noturna',
      members: 67,
      rank: '#28',
      role: 'Membro',
      banner: 'from-purple-600/20 to-violet-600/20 border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
      progress: 34,
    },
  ];

  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-accent" /> Suas Guildas
        </h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors">
            <Plus size={14} /> Criar Guilda
          </button>
          <Link
            href="/app/guilds"
            className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {guilds.map((guild) => (
          <div
            key={guild.name}
            className={cn(
              'rounded-lg border p-4 transition-all duration-300 hover:border-accent/30 hover:bg-[rgba(109,40,217,0.04)]',
              guild.banner,
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm', guild.iconBg)}>
                {guild.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{guild.name}</p>
                  <span className="text-xs text-muted">{guild.rank}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted flex items-center gap-1">
                    <Users size={12} /> {guild.members}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    guild.role === 'Líder' ? 'text-yellow-400 bg-yellow-400/10' :
                    guild.role === 'Oficial' ? 'text-accent bg-accent/10' :
                    'text-muted bg-[rgba(38,51,86,0.3)]',
                  )}>
                    {guild.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted">Contribuição</p>
                  <p className="text-sm font-bold text-white">{guild.progress}%</p>
                </div>
                <Link
                  href="/app/guilds"
                  className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-medium border border-accent/30 hover:bg-accent hover:text-white transition-all duration-200"
                >
                  Acessar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RecentActivity() {
  const activities = [
    { text: 'Completou "Caçador de Sombras"', time: '2 min atrás', icon: Sword, color: 'text-yellow-400' },
    { text: 'Subiu para Nível 42', time: '15 min atrás', icon: TrendingUp, color: 'text-accent' },
    { text: 'Entrou em "Irmandade Noturna"', time: '1 h atrás', icon: Users, color: 'text-blue-400' },
    { text: 'Ganhou medalha de ouro no evento', time: '3 h atrás', icon: Medal, color: 'text-yellow-400' },
    { text: 'Derrotou chefe semanal', time: '5 h atrás', icon: Swords, color: 'text-red-400' },
  ];

  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-accent" /> Atividade
        </h2>
        <span className="text-xs text-muted">Hoje</span>
      </div>

      <div className="space-y-0">
        {activities.map((a, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-3 py-3',
              i < activities.length - 1 && 'border-b border-[rgba(38,51,86,0.3)]',
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[rgba(38,51,86,0.3)] flex items-center justify-center shrink-0">
              <a.icon size={16} className={a.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{a.text}</p>
              <p className="text-xs text-muted mt-0.5">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AchievementProgress() {
  const achievements = [
    { name: 'Guerreiro Lendário', progress: 75, rarity: 'Lendário', color: 'text-orange-400' },
    { name: 'Colecionador de Almas', progress: 45, rarity: 'Épico', color: 'text-purple-400' },
    { name: 'Mestre Forjador', progress: 20, rarity: 'Raro', color: 'text-blue-400' },
  ];

  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" /> Conquistas em Andamento
        </h2>
        <Link
          href="/app/achievements"
          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-4">
        {achievements.map((a) => (
          <div key={a.name}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-white">{a.name}</p>
              <span className={cn('text-xs font-medium', a.rarity === 'Lendário' ? 'text-orange-400' : a.rarity === 'Épico' ? 'text-purple-400' : 'text-blue-400')}>
                {a.progress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  a.rarity === 'Lendário' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                  a.rarity === 'Épico' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                  'bg-gradient-to-r from-blue-500 to-cyan-500',
                )}
                style={{ width: `${a.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function UpcomingEvents() {
  const events = [
    { name: 'Torneio de Arena', date: 'Hoje, 20:00', players: 128, icon: Swords },
    { name: 'Caça ao Tesouro', date: 'Amanhã, 15:00', players: 64, icon: Trophy },
    { name: 'Invasão Demoníaca', date: 'Sábado, 18:00', players: 256, icon: Calendar },
  ];

  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Calendar size={20} className="text-accent" /> Próximos Eventos
        </h2>
        <Link
          href="/app/events"
          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          Ver todos <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        {events.map((e) => (
          <div
            key={e.name}
            className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(38,51,86,0.3)] hover:border-accent/20 transition-all duration-300 bg-[rgba(10,18,32,0.4)]"
          >
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <e.icon size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{e.name}</p>
              <p className="text-xs text-muted">{e.date} • {e.players} jogadores</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
