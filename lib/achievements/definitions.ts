export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory =
  | 'Progressão'
  | 'Comunidade'
  | 'Social'
  | 'Eventos'
  | 'DKP'
  | 'Stream';

export type AchievementTrigger =
  | 'account_created'
  | 'joined_guild'
  | 'created_guild'
  | 'updated_profile'
  | 'commented_profile'
  | 'event_attended'
  | 'dkp_loot'
  | 'friend_added'
  | 'livestream';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  rarity: Rarity;
  category: AchievementCategory;
  xp: number;
  icon: string; // lucide icon name
  trigger: AchievementTrigger;
  threshold: number; // 1 = single, 50/200 = cumulative
  hidden?: boolean;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ============ COMUM (1x) ============
  {
    id: 'common_account_created',
    title: 'Criou a conta',
    description: 'Crie sua primeira conta no ClanForge',
    rarity: 'common',
    category: 'Progressão',
    xp: 50,
    icon: 'User',
    trigger: 'account_created',
    threshold: 1,
  },
  {
    id: 'common_joined_guild',
    title: 'Entrou em uma guild',
    description: 'Entre em uma guilda pela primeira vez',
    rarity: 'common',
    category: 'Comunidade',
    xp: 100,
    icon: 'Shield',
    trigger: 'joined_guild',
    threshold: 1,
  },
  {
    id: 'common_created_guild',
    title: 'Criou uma guild',
    description: 'Funde sua própria guilda',
    rarity: 'common',
    category: 'Comunidade',
    xp: 150,
    icon: 'Crown',
    trigger: 'created_guild',
    threshold: 1,
  },
  {
    id: 'common_updated_profile',
    title: 'Atualizou seu perfil',
    description: 'Personalize seu perfil pela primeira vez',
    rarity: 'common',
    category: 'Social',
    xp: 30,
    icon: 'UserCircle',
    trigger: 'updated_profile',
    threshold: 1,
  },
  {
    id: 'common_commented_profile',
    title: 'Comentou no perfil de alguém',
    description: 'Deixe um recado no mural de outro jogador',
    rarity: 'common',
    category: 'Social',
    xp: 30,
    icon: 'MessageCircle',
    trigger: 'commented_profile',
    threshold: 1,
  },
  {
    id: 'common_event_1',
    title: 'Participou de um evento',
    description: 'Resgate o código de presença em um evento do calendário',
    rarity: 'common',
    category: 'Eventos',
    xp: 80,
    icon: 'Calendar',
    trigger: 'event_attended',
    threshold: 1,
  },
  {
    id: 'common_dkp_loot_1',
    title: 'Ganhou Loot no sistema DKP',
    description: 'Receba seu primeiro loot via DKP',
    rarity: 'common',
    category: 'DKP',
    xp: 80,
    icon: 'Gem',
    trigger: 'dkp_loot',
    threshold: 1,
  },
  {
    id: 'common_friend_1',
    title: 'Adicionou um amigo',
    description: 'Adicione alguém à sua lista de amigos',
    rarity: 'common',
    category: 'Social',
    xp: 30,
    icon: 'UserPlus',
    trigger: 'friend_added',
    threshold: 1,
  },
  {
    id: 'common_stream_1',
    title: 'Fez uma livestream',
    description: 'Fique em live na Twitch, Kick ou YouTube',
    rarity: 'common',
    category: 'Stream',
    xp: 100,
    icon: 'Video',
    trigger: 'livestream',
    threshold: 1,
  },

  // ============ RARA (50x) ============
  {
    id: 'rare_events_50',
    title: 'Veterano de Eventos',
    description: 'Participou de 50 eventos',
    rarity: 'rare',
    category: 'Eventos',
    xp: 500,
    icon: 'CalendarCheck',
    trigger: 'event_attended',
    threshold: 50,
  },
  {
    id: 'rare_dkp_50',
    title: 'Caçador de Loot',
    description: 'Ganhou 50x loot no sistema DKP',
    rarity: 'rare',
    category: 'DKP',
    xp: 500,
    icon: 'Gem',
    trigger: 'dkp_loot',
    threshold: 50,
  },
  {
    id: 'rare_friends_50',
    title: 'Popular',
    description: 'Adicionou 50 amigos',
    rarity: 'rare',
    category: 'Social',
    xp: 500,
    icon: 'Users',
    trigger: 'friend_added',
    threshold: 50,
  },
  {
    id: 'rare_streams_50',
    title: 'Streamer Dedicado',
    description: 'Fez 50 livestreams',
    rarity: 'rare',
    category: 'Stream',
    xp: 500,
    icon: 'Video',
    trigger: 'livestream',
    threshold: 50,
  },

  // ============ ÉPICA (200x) ============
  {
    id: 'epic_events_200',
    title: 'Lenda dos Eventos',
    description: 'Participou de 200 eventos',
    rarity: 'epic',
    category: 'Eventos',
    xp: 2000,
    icon: 'Trophy',
    trigger: 'event_attended',
    threshold: 200,
  },
  {
    id: 'epic_dkp_200',
    title: 'Lenda do DKP',
    description: 'Ganhou 200x loot no sistema DKP',
    rarity: 'epic',
    category: 'DKP',
    xp: 2000,
    icon: 'Crown',
    trigger: 'dkp_loot',
    threshold: 200,
  },
  {
    id: 'epic_friends_200',
    title: 'Rede Lendária',
    description: 'Adicionou 200 amigos',
    rarity: 'epic',
    category: 'Social',
    xp: 2000,
    icon: 'Users',
    trigger: 'friend_added',
    threshold: 200,
  },
  {
    id: 'epic_streams_200',
    title: 'Estrela das Lives',
    description: 'Fez 200 livestreams',
    rarity: 'epic',
    category: 'Stream',
    xp: 2000,
    icon: 'Radio',
    trigger: 'livestream',
    threshold: 200,
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<string, AchievementDefinition>;

export const XP_BY_RARITY: Record<Rarity, number> = {
  common: 50,
  rare: 500,
  epic: 2000,
  legendary: 5000,
};

export const rarityLabel: Record<Rarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export const rarityStyle: Record<Rarity, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: 'bg-muted/10', text: 'text-muted', border: 'border-muted/20', glow: '' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  legendary: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
};
