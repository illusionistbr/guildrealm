'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/admin/firebase/client';
import type {
  AnalysisRequest,
  AnalysisSubmission,
  AnalysisComment,
} from './types';

const getFn = <TInput, TOutput>(name: string) =>
  httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp()), name);

// ============ UPLOAD ============

export async function getUploadUrl(params: {
  guildId: string;
  requestId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  const fn = getFn<typeof params, {
    presignedUrl: string;
    objectKey: string;
    submissionId: string;
    expiresInSeconds: number;
    useMultipart: boolean;
  }>('getAnalysisUploadUrl');
  const res = await fn(params);
  return res.data;
}

export async function initMultipartUpload(params: {
  guildId: string;
  requestId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  partSize?: number;
}) {
  const fn = getFn<typeof params, {
    objectKey: string;
    submissionId: string;
    partSize: number;
    totalParts: number;
    contentType: string;
  }>('initMultipartUpload');
  const res = await fn(params);
  return res.data;
}

export async function presignMultipartPart(params: {
  objectKey: string;
  partNumber: number;
  contentType: string;
}) {
  const fn = getFn<typeof params, { presignedUrl: string; partNumber: number }>('presignMultipartPart');
  const res = await fn(params);
  return res.data;
}

export async function confirmMultipartUpload(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  objectKey: string;
}) {
  const fn = getFn<typeof params, { success: boolean; objectKey: string }>('completeMultipartUpload');
  const res = await fn(params);
  return res.data;
}

export async function confirmUpload(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  objectKey: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}) {
  const fn = getFn<typeof params, { success: boolean; submissionId: string }>('confirmAnalysisUpload');
  const res = await fn(params);
  return res.data;
}

export async function getPlayUrl(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
}) {
  const fn = getFn<typeof params, { url?: string; contentType?: string; expired?: boolean; reason?: string }>('getAnalysisPlayUrl');
  const res = await fn(params);
  return res.data;
}

// ============ REQUESTS ============

export async function createAnalysisRequest(params: {
  guildId: string;
  title: string;
  description?: string;
  game: string;
  type?: string;
  eventDate?: string;
  deadline?: string;
  maxVideoSize?: number;
  allowMultipleSubmissions?: boolean;
  targetMembers?: string;
}) {
  const fn = getFn<typeof params, { success: boolean; requestId: string }>('createAnalysisRequest');
  const res = await fn(params);
  return res.data;
}

export async function updateAnalysisRequestStatus(params: {
  guildId: string;
  requestId: string;
  status: 'open' | 'closed' | 'archived';
}) {
  const fn = getFn<typeof params, { success: boolean }>('updateAnalysisRequest');
  const res = await fn(params);
  return res.data;
}

// ============ COMMENTS ============

export async function addComment(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  timestamp: number;
  text: string;
}) {
  const fn = getFn<typeof params, { success: boolean; commentId: string }>('addAnalysisComment');
  const res = await fn(params);
  return res.data;
}

export async function updateComment(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  commentId: string;
  text: string;
}) {
  const fn = getFn<typeof params, { success: boolean }>('updateAnalysisComment');
  const res = await fn(params);
  return res.data;
}

export async function deleteComment(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  commentId: string;
}) {
  const fn = getFn<typeof params, { success: boolean }>('deleteAnalysisComment');
  const res = await fn(params);
  return res.data;
}

// ============ REVIEWS ============

export async function saveReview(params: {
  guildId: string;
  requestId: string;
  submissionId: string;
  scores?: Record<string, number>;
  generalFeedback?: string;
  strongPoints?: string;
  improvementPoints?: string;
  recommendation?: string;
  overallScore?: number;
}) {
  const fn = getFn<typeof params, { success: boolean }>('saveAnalysisReview');
  const res = await fn(params);
  return res.data;
}
