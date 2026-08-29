export const EVENT_TYPES = {
  RAID: 'RAID',
  DUNGEON: 'DUNGEON',
  WORLD_BOSS: 'WORLD_BOSS',
  GUILD_WAR: 'GUILD_WAR',
  PVP: 'PVP',
  TOURNAMENT: 'TOURNAMENT',
  MEETING: 'MEETING',
  TRAINING: 'TRAINING',
  OTHER: 'OTHER',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  RAID: {
    label: 'Raid',
    icon: '\u2694\uFE0F',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.4)',
  },
  DUNGEON: {
    label: 'Dungeon',
    icon: '\uD83D\uDEE1\uFE0F',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.4)',
  },
  WORLD_BOSS: {
    label: 'World Boss',
    icon: '\uD83D\uDC09',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.15)',
    border: 'rgba(249,115,22,0.4)',
  },
  GUILD_WAR: {
    label: 'Guerra',
    icon: '\uD83C\uDFF0',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.4)',
  },
  PVP: {
    label: 'PvP',
    icon: '\u2694\uFE0F',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.15)',
    border: 'rgba(236,72,153,0.4)',
  },
  TOURNAMENT: {
    label: 'Torneio',
    icon: '\uD83C\uDFC6',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.15)',
    border: 'rgba(234,179,8,0.4)',
  },
  MEETING: {
    label: 'Reuni\u00E3o',
    icon: '\uD83D\uDCAC',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.15)',
    border: 'rgba(6,182,212,0.4)',
  },
  TRAINING: {
    label: 'Treinamento',
    icon: '\uD83C\uDFCB\uFE0F',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.4)',
  },
  OTHER: {
    label: 'Outro',
    icon: '\uD83D\uDCC5',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.4)',
  },
};

export interface GuildCalendarEvent {
  id: string;
  guildId: string;
  title: string;
  description: string;
  type: EventType;
  start: Date;
  end: Date;
  location: string;
  maxParticipants: number | null;
  allowRegistration: boolean;
  status: 'active' | 'cancelled' | 'completed';
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  attendanceEnabled: boolean;
  dkpReward?: number;
}

export interface EventConfirmation {
  userId: string;
  displayName: string;
  confirmedAt: Date;
}

export interface EventParticipant {
  userId: string;
  displayName: string;
  joinedAt: Date;
}
