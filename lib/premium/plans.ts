/**
 * Plano premium do usuário — single source of truth.
 *
 * O premium é por USUÁRIO (não por personagem nem por guild):
 * todos os personagens do usuário herdam os benefícios do plano,
 * e os limites/recursos da guild derivam do plano do DONO (ownerId).
 *
 * Planos:
 * - free:         1 guild,  50 membros, sem VOD / webhook / loot / dkp / auditoria
 * - elite:        1 guild, 100 membros, tudo liberado
 * - conquistador: 5 guilds, 100 membros cada, tudo liberado
 *
 * Comunidades (agregado de guilds do mesmo clã, ex.: "Shadowborn" com
 * guilds de FF, ESO e GW): todos os planos podem criar 1 comunidade.
 * Cada guild pode pertencer a no máximo 1 comunidade. As guilds
 * vinculáveis são as do próprio usuário — já limitadas por maxGuilds.
 */

export type PlanId = 'free' | 'elite' | 'conquistador';

export type PlanFeatures = {
  /** envio + requisição de VOD (análises) */
  vod: boolean;
  /** configuração do webhook do Discord */
  discordWebhook: boolean;
  /** sistema de loot */
  loot: boolean;
  /** sistema de DKP */
  dkp: boolean;
  /** montagem de grupos e modelos/presets */
  groups: boolean;
  /** calendário, eventos e confirmação de presença */
  calendar: boolean;
  /** auditoria / activity feed completo */
  audit: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  label: string;
  maxGuilds: number;
  maxMembers: number;
  /** quantas comunidades o usuário pode criar */
  maxCommunities: number;
  features: PlanFeatures;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    label: 'Grátis',
    maxGuilds: 1,
    maxMembers: 50,
    maxCommunities: 1,
    features: {
      vod: false,
      discordWebhook: false,
      loot: false,
      dkp: false,
      groups: true,
      calendar: true,
      audit: false,
    },
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    maxGuilds: 1,
    maxMembers: 100,
    maxCommunities: 1,
    features: {
      vod: true,
      discordWebhook: true,
      loot: true,
      dkp: true,
      groups: true,
      calendar: true,
      audit: true,
    },
  },
  conquistador: {
    id: 'conquistador',
    label: 'Conquistador',
    maxGuilds: 5,
    maxMembers: 100,
    maxCommunities: 1,
    features: {
      vod: true,
      discordWebhook: true,
      loot: true,
      dkp: true,
      groups: true,
      calendar: true,
      audit: true,
    },
  },
};

export type UserPlanDoc = {
  plan?: PlanId;
  planExpiresAt?: { seconds: number; nanoseconds?: number } | null;
  planStartedAt?: { seconds: number; nanoseconds?: number } | null;
  /** legado — mantido por compatibilidade */
  premium?: boolean;
};

function toMillis(
  ts: { seconds: number; nanoseconds?: number } | null | undefined,
): number | null {
  if (!ts || typeof ts.seconds !== 'number') return null;
  return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6);
}

/** Normaliza o plano do usuário, tratando expiração como downgrade para free. */
export function resolvePlanId(user: UserPlanDoc | null | undefined, now = Date.now()): PlanId {
  const raw = user?.plan;
  if (raw !== 'elite' && raw !== 'conquistador') return 'free';
  const exp = toMillis(user?.planExpiresAt);
  // Sem expiração definida = considera vitalício/ativo (admin). Com expiração passada = free.
  if (exp !== null && exp <= now) return 'free';
  return raw;
}

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return PLANS[planId] ?? PLANS.free;
}

export function getUserPlanDefinition(
  user: UserPlanDoc | null | undefined,
  now = Date.now(),
): PlanDefinition {
  return getPlanDefinition(resolvePlanId(user, now));
}

/** Dias inteiros restantes (ceil). Retorna 0 se expirado, null se for free. */
export function getRemainingDays(
  user: UserPlanDoc | null | undefined,
  now = Date.now(),
): number | null {
  const planId = resolvePlanId(user, now);
  if (planId === 'free') return null;
  const exp = toMillis(user?.planExpiresAt);
  if (exp === null) return null; // sem expiração = vitalício
  const diff = exp - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function isPremiumPlan(planId: PlanId): boolean {
  return planId === 'elite' || planId === 'conquistador';
}
