'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import { uploadVideo, type UploadProgress } from '@/lib/analyses/upload';
import {
  ANALYSIS_TYPE_CONFIG,
  type AnalysisRequest,
  type AnalysisSubmission,
} from '@/lib/analyses/types';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileVideo,
  X,
  Loader2,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface UploadViewProps {
  guildId: string;
  uid: string | null;
  memberIds: string[];
}

export function UploadView({ guildId, uid, memberIds }: UploadViewProps) {
  const t = useTranslations('GuildPanel');
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AnalysisSubmission[]>>({});
  const [selectedRequest, setSelectedRequest] = useState<AnalysisRequest | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load open analysis requests
  useEffect(() => {
    if (!guildId) return;

    const q = query(
      collection(getFirebaseDb(), 'guilds', guildId, 'analysisRequests'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as AnalysisRequest[];
      setRequests(items);
    });

    return unsub;
  }, [guildId]);

  // Load user's submissions for each request
  useEffect(() => {
    if (!guildId || !uid || requests.length === 0) return;

    const unsubs = requests.map((request) => {
      const q = query(
        collection(getFirebaseDb(), 'guilds', guildId, 'analysisRequests', request.id, 'submissions'),
        where('userId', '==', uid)
      );

      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          uploadedAt: d.data().uploadedAt?.toDate() || new Date(),
          updatedAt: d.data().updatedAt?.toDate() || new Date(),
        })) as AnalysisSubmission[];

        setSubmissions((prev) => ({ ...prev, [request.id]: items }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [guildId, uid, requests]);

  const handleFileSelect = useCallback((file: File) => {
    setUploadedFile(file);
    setSelectedRequest(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = async (request: AnalysisRequest) => {
    if (!uploadedFile || !uid) return;

    setSelectedRequest(request);

    try {
      await uploadVideo(uploadedFile, guildId, request.id, request.maxVideoSize, {
        onProgress: setUploadProgress,
        onComplete: (submissionId) => {
          setUploadProgress(null);
          setUploadedFile(null);
          setSelectedRequest(null);
        },
        onError: (error) => {
          setUploadProgress((prev) => prev ? { ...prev, stage: 'error', error } : null);
        },
      });
    } catch (error) {
      setUploadProgress(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)} segundos`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-8 text-center">
        <FileVideo size={48} className="mx-auto text-muted mb-4" />
        <p className="text-white font-heading font-semibold">{t('analysisNoRequests')}</p>
        <p className="text-muted mt-1">{t('analysisNoRequestsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] hover:border-accent/50'
        )}
      >
        {uploadedFile ? (
          <div className="space-y-2">
            <FileVideo size={32} className="mx-auto text-accent" />
            <p className="text-white font-medium">{uploadedFile.name}</p>
            <p className="text-muted text-sm">{formatFileSize(uploadedFile.size)}</p>
            <button
              onClick={() => setUploadedFile(null)}
              className="text-sm text-muted hover:text-white transition-colors"
            >
              {t('analysisChangeFile')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={48} className="mx-auto text-muted" />
            <p className="text-white font-medium">{t('analysisSelectVideo')}</p>
            <p className="text-muted text-sm">{t('analysisDragDrop')}</p>
            <p className="text-muted text-xs">
              {t('analysisFormats')}: MP4, WebM, MOV
            </p>
          </div>
        )}
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {requests.map((request) => {
          const userSubmissions = submissions[request.id] || [];
          const hasSubmitted = userSubmissions.length > 0;
          const typeConfig = ANALYSIS_TYPE_CONFIG[request.type] || ANALYSIS_TYPE_CONFIG.other;

          return (
            <motion.div
              key={request.id}
              variants={fadeUp}
              className={cn(
                'rounded-xl border p-4 transition-all duration-200',
                hasSubmitted
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] hover:border-accent/30'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                    >
                      {typeConfig.icon} {typeConfig.label}
                    </span>
                    {hasSubmitted && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t('analysisSubmitted')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-heading font-semibold">{request.title}</h3>
                  {request.description && (
                    <p className="text-muted text-sm mt-1 line-clamp-2">{request.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    {request.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {t('analysisDeadline')}: {new Date(request.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <span>{formatFileSize(request.maxVideoSize)}</span>
                  </div>
                </div>

                {!hasSubmitted && uploadedFile && (
                  <button
                    onClick={() => handleUpload(request)}
                    disabled={!!uploadProgress}
                    className="shrink-0 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadProgress?.stage === 'uploading' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      t('analysisUpload')
                    )}
                  </button>
                )}
              </div>

              {/* Upload Progress */}
              {selectedRequest?.id === request.id && uploadProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-[rgba(38,51,86,0.3)]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">
                        {uploadProgress.stage === 'validating' && t('analysisValidating')}
                        {uploadProgress.stage === 'preparing' && t('analysisPreparing')}
                        {uploadProgress.stage === 'uploading' && t('analysisUploading')}
                        {uploadProgress.stage === 'confirming' && t('analysisConfirming')}
                        {uploadProgress.stage === 'complete' && t('analysisComplete')}
                        {uploadProgress.stage === 'error' && t('analysisError')}
                      </span>
                      {uploadProgress.stage === 'uploading' && (
                        <span className="text-muted">
                          {formatSpeed(uploadProgress.speed)} • {formatTime(uploadProgress.estimatedTimeRemaining)}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full transition-colors',
                          uploadProgress.stage === 'error' ? 'bg-red-500' : 'bg-accent'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}</span>
                      <span>{Math.round(uploadProgress.progress)}%</span>
                    </div>

                    {uploadProgress.error && (
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle size={16} />
                        {uploadProgress.error}
                      </div>
                    )}

                    {uploadProgress.stage === 'complete' && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle2 size={16} />
                        {t('analysisUploadSuccess')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Existing Submissions */}
              {hasSubmitted && (
                <div className="mt-3 pt-3 border-t border-[rgba(38,51,86,0.3)]">
                  {userSubmissions.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-muted">{sub.originalFileName}</span>
                      <span className="text-xs text-muted">• {formatFileSize(sub.fileSize)}</span>
                      {sub.reviewStatus === 'completed' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">
                          {t('analysisReviewed')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
