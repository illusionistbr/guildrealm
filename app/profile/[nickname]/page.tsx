'use client';

import React from 'react';

import { motion } from 'framer-motion';
import { cn } from '@/lib/admin/utils/cn';
import { ProfileMural } from '@/components/app/profile-mural';
import {
  User, Shield, Trophy, Users, Calendar,
  MapPin, Clock, Swords, MessageCircle,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

function SocialIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const s = size;
  const icons: Record<string, React.ReactNode> = {
    discord: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
    instagram: <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    twitter: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    facebook: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    youtube: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    twitch: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>,
    steam: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12.001-5.373 12.001-12S18.606 0 11.979 0z"/></svg>,
    website: null,
  };
  if (platform === 'website') return <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  return icons[platform] || null;
}

// Simulated profile data — in production this would come from Firestore
const profileData = {
  displayName: 'Jogador',
  nickname: 'jogador',
  bio: 'Aventureiro apaixonado por explorar masmorras e colecionar conquistas. Líder dos Dragões de Fogo.',
  level: 42,
  className: 'Mago',
  region: 'América do Sul',
  memberSince: 'Jan 2024',
  lastOnline: 'Hoje, 14:32',
  totalHours: 1247,
  guilds: [
    { name: 'Dragões de Fogo', rank: '#3', role: 'Líder', members: 128, color: 'bg-red-500/20 text-red-400' },
    { name: 'Guardiões do Vale', rank: '#12', role: 'Oficial', members: 94, color: 'bg-blue-500/20 text-blue-400' },
    { name: 'Irmandade Noturna', rank: '#28', role: 'Membro', members: 67, color: 'bg-purple-500/20 text-purple-400' },
  ],
  achievements: [
    { name: 'Caçador de Sombras', rarity: 'Épico', icon: '⚔️' },
    { name: 'Aventureiro Curioso', rarity: 'Raro', icon: '🗺️' },
    { name: 'Guerreiro Lendário', rarity: 'Lendário', icon: '👑' },
  ],
  friends: [
    { name: 'Thalos', level: 45, online: true },
    { name: 'Lyra', level: 39, online: true },
    { name: 'Auron', level: 37, online: false },
    { name: 'Seraphina', level: 41, online: true },
    { name: 'Draven', level: 33, online: false },
    { name: 'Elara', level: 40, online: true },
  ],
  socialLinks: {
    discord: 'jogador#0001',
    instagram: '@jogador_gr',
    twitter: '@jogador_gr',
  },
  visibility: {
    showGuilds: true,
    showAchievements: true,
    showFriends: true,
    showBio: true,
  },
};

export default function PublicProfilePage() {
  const p = profileData;

  return (
    <div className="min-h-screen bg-[#050912]">
      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-[#0a1122]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050912] to-transparent" />
      </div>

      <div className="shell -mt-16 relative z-10 pb-10">
        <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
          {/* Header */}
          <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-start md:items-end gap-5">
            <div className="w-28 h-28 rounded-full border-4 border-[#050912] bg-accent/20 flex items-center justify-center">
              <User size={48} className="text-accent" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-heading font-bold text-white">{p.displayName}</h1>
              <p className="text-muted text-sm">@{p.nickname}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">Nível {p.level}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">{p.className}</span>
                <span className="text-xs text-muted flex items-center gap-1"><MapPin size={12} /> {p.region}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors">
                <Users size={16} /> Adicionar Amigo
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm hover:text-white hover:border-accent/30 transition-colors">
                <MessageCircle size={16} /> Mensagem
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Bio */}
              {p.visibility.showBio && (
                <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
                  <h3 className="text-sm font-heading font-bold text-white mb-2">Sobre</h3>
                  <p className="text-sm text-muted leading-relaxed">{p.bio}</p>
                  <div className="mt-4 space-y-2 text-xs text-muted">
                    <div className="flex items-center gap-2"><Calendar size={14} /> Membro desde {p.memberSince}</div>
                    <div className="flex items-center gap-2"><Clock size={14} /> Último acesso: {p.lastOnline}</div>
                    <div className="flex items-center gap-2"><Swords size={14} /> {p.totalHours.toLocaleString('pt-BR')}h jogadas</div>
                  </div>
                </motion.div>
              )}

              {/* Social Links */}
              {Object.keys(p.socialLinks).length > 0 && (
                <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
                  <h3 className="text-sm font-heading font-bold text-white mb-3">Redes Sociais</h3>
                  <div className="space-y-2">
                    {Object.entries(p.socialLinks).map(([platform, value]) => (
                      <div key={platform} className="flex items-center gap-2 text-sm">
                        <span className="text-accent"><SocialIcon platform={platform} /></span>
                        <span className="text-muted capitalize">{platform === 'twitter' ? 'X / Twitter' : platform}:</span>
                        <span className="text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Guilds */}
              {p.visibility.showGuilds && (
                <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
                  <h3 className="text-sm font-heading font-bold text-white mb-3 flex items-center gap-2">
                    <Shield size={16} className="text-accent" /> Guildas
                  </h3>
                  <div className="space-y-2">
                    {p.guilds.map((g) => (
                      <div key={g.name} className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(10,18,32,0.4)]">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs', g.color)}>
                          {g.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{g.name}</p>
                          <p className="text-[10px] text-muted">{g.members} membros • {g.role}</p>
                        </div>
                        <span className="text-[10px] text-muted">{g.rank}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Achievements */}
              {p.visibility.showAchievements && (
                <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
                  <h3 className="text-sm font-heading font-bold text-white mb-3 flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-400" /> Conquistas Recentes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {p.achievements.map((a) => (
                      <div key={a.name} className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                        a.rarity === 'Lendário' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                        a.rarity === 'Épico' ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' :
                        'border-blue-500/30 bg-blue-500/10 text-blue-400',
                      )}>
                        <span>{a.icon}</span>
                        <span className="font-medium">{a.name}</span>
                        <span className="text-[10px] opacity-60">• {a.rarity}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Friends */}
              {p.visibility.showFriends && (
                <motion.div variants={fadeUp} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
                  <h3 className="text-sm font-heading font-bold text-white mb-3 flex items-center gap-2">
                    <Users size={16} className="text-accent" /> Amigos ({p.friends.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {p.friends.map((f) => (
                      <div key={f.name} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(10,18,32,0.4)]">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <User size={14} className="text-accent" />
                          </div>
                          <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#050912]',
                            f.online ? 'bg-green-400' : 'bg-[rgba(38,51,86,0.5)]',
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted">Lv. {f.level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Mural */}
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle size={18} className="text-accent" /> Mural de Recados
                </h3>
                <ProfileMural isOwner={false} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
