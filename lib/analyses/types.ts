export const ANALYSIS_TYPES = {
  GVG: 'gvg',
  PVP: 'pvp',
  PVE: 'pve',
  RAID: 'raid',
  DUNGEON: 'dungeon',
  ARENA: 'arena',
  TOURNAMENT: 'tournament',
  SCRIM: 'scrim',
  TRAINING: 'training',
  OTHER: 'other',
} as const;

export type AnalysisType = (typeof ANALYSIS_TYPES)[keyof typeof ANALYSIS_TYPES];

export const ANALYSIS_TYPE_CONFIG: Record<AnalysisType, { label: string; icon: string; color: string }> = {
  gvg: { label: 'GvG', icon: '⚔️', color: '#a855f7' },
  pvp: { label: 'PvP', icon: '🛡️', color: '#fb7185' },
  pve: { label: 'PvE', icon: '🎯', color: '#34d399' },
  raid: { label: 'Raid', icon: '🐉', color: '#f97316' },
  dungeon: { label: 'Dungeon', icon: '🏰', color: '#3b82f6' },
  arena: { label: 'Arena', icon: '🏟️', color: '#eab308' },
  tournament: { label: 'Torneio', icon: '🏆', color: '#eab308' },
  scrim: { label: 'Scrim', icon: '⚔️', color: '#8b5cf6' },
  training: { label: 'Treinamento', icon: '📚', color: '#22c55e' },
  other: { label: 'Outro', icon: '📋', color: '#8b5cf6' },
};

export const ANALYSIS_REQUEST_STATUSES = ['open', 'closed', 'archived'] as const;
export type AnalysisRequestStatus = (typeof ANALYSIS_REQUEST_STATUSES)[number];

export const SUBMISSION_STATUSES = ['uploading', 'uploaded', 'under_review', 'reviewed', 'rejected'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const VIDEO_STATUSES = ['available', 'expired'] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_RETENTION_DAYS = 7;

export function isVideoExpired(sub: { videoExpiresAt?: Date | null; uploadedAt?: Date | null; videoStatus?: VideoStatus }): boolean {
  if (sub.videoStatus === 'expired') return true;
  const expiresAt = sub.videoExpiresAt || (sub.uploadedAt ? new Date(sub.uploadedAt.getTime() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000) : null);
  if (!expiresAt) return false;
  return new Date() >= expiresAt;
}

export const RETENTION_OPTIONS = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 180, label: '180 dias' },
  { value: -1, label: 'Nunca excluir' },
] as const;

export interface AnalysisRequest {
  id: string;
  guildId: string;
  title: string;
  description: string;
  game: string;
  type: AnalysisType;
  eventDate: string | null;
  deadline: string | null;
  maxVideoSize: number;
  allowMultipleSubmissions: boolean;
  targetMembers: string;
  createdBy: string;
  createdAt: Date;
  status: AnalysisRequestStatus;
}

export interface AnalysisSubmission {
  id: string;
  userId: string;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  duration?: number;
  status: SubmissionStatus;
  uploadedAt: Date;
  updatedAt: Date;
  reviewStatus: ReviewStatus;
  videoStatus?: VideoStatus;
  videoExpiresAt?: Date | null;
  reviewerId?: string;
  reviewedAt?: Date;
  overallScore?: number;
  generalFeedback?: string;
  strongPoints?: string;
  improvementPoints?: string;
  recommendation?: string;
  scores?: Record<string, number>;
}

export interface AnalysisComment {
  id: string;
  userId: string;
  timestamp: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisTab {
  id: 'submit' | 'request' | 'review';
  label: string;
  icon: string;
  requiresPermission?: string;
}
