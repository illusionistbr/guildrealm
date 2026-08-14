export const GROUP_TYPES = {
  PVE: 'PVE',
  PVP: 'PVP',
  RAID: 'RAID',
  DUNGEON: 'DUNGEON',
  WAR: 'WAR',
  TOURNAMENT: 'TOURNAMENT',
  OTHER: 'OTHER',
} as const;

export type GroupType = (typeof GROUP_TYPES)[keyof typeof GROUP_TYPES];

export const GROUP_TYPE_CONFIG: Record<
  GroupType,
  { label: string; icon: string; color: string }
> = {
  PVE: { label: 'PvE', icon: '\uD83C\uDFAF', color: '#34d399' },
  PVP: { label: 'PvP', icon: '\u2694\uFE0F', color: '#fb7185' },
  RAID: { label: 'Raid', icon: '\uD83D\uDC09', color: '#f97316' },
  DUNGEON: { label: 'Dungeon', icon: '\uD83D\uDEE1\uFE0F', color: '#3b82f6' },
  WAR: { label: 'Guerra', icon: '\uD83C\uDFF0', color: '#a855f7' },
  TOURNAMENT: { label: 'Torneio', icon: '\uD83C\uDFC6', color: '#eab308' },
  OTHER: { label: 'Outro', icon: '\uD83D\uDCC5', color: '#8b5cf6' },
};

export const GROUP_SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

export const GROUP_HEADER_COLORS = [
  { id: 'blue', label: 'Azul', value: '#2563eb' },
  { id: 'green', label: 'Verde', value: '#059669' },
  { id: 'purple', label: 'Roxo', value: '#7c3aed' },
  { id: 'orange', label: 'Laranja', value: '#ea580c' },
  { id: 'red', label: 'Vermelho', value: '#dc2626' },
  { id: 'yellow', label: 'Amarelo', value: '#d97706' },
  { id: 'cyan', label: 'Ciano', value: '#0891b2' },
  { id: 'pink', label: 'Rosa', value: '#db2777' },
  { id: 'slate', label: 'Cinza', value: '#475569' },
];

export const DEFAULT_ROLE_ICONS = [
  'Shield',
  'Sword',
  'HeartPulse',
  'Sparkles',
  'Crosshair',
  'Flame',
  'Snowflake',
  'Zap',
  'Star',
  'Users',
  'Gem',
  'Crown',
  'Trophy',
  'Wand2',
  'Axe',
  'BowArrow',
  'Ghost',
  'Skull',
  'Leaf',
  'Moon',
];

export interface GuildGroup {
  id: string;
  guildId: string;
  name: string;
  type: GroupType;
  headerColor: string;
  maxPlayers: number;
  presetId?: string;
  position: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GroupMemberEntry {
  userId: string;
  roleId: string | null;
  position: number;
  joinedAt?: Date;
}

export interface GuildRole {
  id: string;
  guildId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdBy: string;
  createdAt?: Date;
}

export interface PresetGroup {
  id: string;
  name: string;
  maxPlayers: number;
  roles: { roleId: string; quantity: number }[];
}

export interface GuildPreset {
  id: string;
  guildId: string;
  name: string;
  description: string;
  category: GroupType;
  icon: string;
  color: string;
  groups: PresetGroup[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DEFAULT_ROLES: Omit<GuildRole, 'id' | 'guildId' | 'createdBy' | 'createdAt'>[] = [
  { name: 'Tank', icon: 'Shield', color: '#3b82f6', isDefault: true },
  { name: 'DPS', icon: 'Sword', color: '#ef4444', isDefault: true },
  { name: 'Healer', icon: 'HeartPulse', color: '#22c55e', isDefault: true },
  { name: 'Off-healer', icon: 'Sparkles', color: '#a855f7', isDefault: true },
];

export const ROLE_COLORS = [
  { id: 'blue', label: 'Azul', value: '#3b82f6' },
  { id: 'red', label: 'Vermelho', value: '#ef4444' },
  { id: 'green', label: 'Verde', value: '#22c55e' },
  { id: 'purple', label: 'Roxo', value: '#a855f7' },
  { id: 'orange', label: 'Laranja', value: '#f97316' },
  { id: 'yellow', label: 'Amarelo', value: '#eab308' },
  { id: 'cyan', label: 'Ciano', value: '#06b6d4' },
  { id: 'pink', label: 'Rosa', value: '#ec4899' },
  { id: 'slate', label: 'Cinza', value: '#64748b' },
];