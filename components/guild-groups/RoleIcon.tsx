'use client';

import {
  Shield,
  Sword,
  HeartPulse,
  Sparkles,
  Crosshair,
  Flame,
  Snowflake,
  Zap,
  Star,
  Users,
  Gem,
  Crown,
  Trophy,
  Wand2,
  Axe,
  Ghost,
  Skull,
  Leaf,
  Moon,
  Target,
  Castle,
  Trophy as TrophyIcon,
  Swords,
  type LucideIcon,
} from 'lucide-react';

export const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Sword,
  HeartPulse,
  Sparkles,
  Crosshair,
  Flame,
  Snowflake,
  Zap,
  Star,
  Users,
  Gem,
  Crown,
  Trophy,
  Wand2,
  Axe,
  Ghost,
  Skull,
  Leaf,
  Moon,
};

export const GROUP_TYPE_ICONS: Record<string, LucideIcon> = {
  PVE: Target,
  PVP: Swords,
  RAID: TrophyIcon,
  DUNGEON: Castle,
  WAR: Swords,
  TOURNAMENT: TrophyIcon,
  OTHER: Users,
};

export function RoleIcon({
  icon,
  color,
  size = 14,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  const Icon = ROLE_ICON_MAP[icon] ?? Users;
  return <Icon size={size} style={{ color }} />;
}