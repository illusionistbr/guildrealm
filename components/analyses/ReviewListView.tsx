'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import {
  ANALYSIS_TYPE_CONFIG,
  type AnalysisRequest,
  type AnalysisSubmission,
} from '@/lib/analyses/types';
import { VideoReview } from './VideoReview';
import {
  Users,
  CheckCircle2,
  Clock,
  Eye,
  ChevronRight,
  BarChart3,
  Filter,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface ReviewListViewProps {
  guildId: string;
  uid: string | null;
  isLeader: boolean;
  memberNames: Record<string, string>;
}

export function ReviewListView({ guildId, uid, isLeader, memberNames }: ReviewListViewProps) {
  const t = useTranslations('GuildPanel');
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AnalysisRequest | null>(null);
  const [submissions, setSubmissions] = useState<AnalysisSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<AnalysisSubmission | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'uploaded' | 'reviewed'>('all');

  // Load all analysis requests
  useEffect(() => {
    if (!guildId) return;

    const q = query(
      collection(getFirebaseDb(), 'guilds', guildId, 'analysisRequests'),
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

  // Load submissions for selected request
  useEffect(() => {
    if (!guildId || !selectedRequest) {
      setSubmissions([]);
      return;
    }

    const q = query(
      collection(getFirebaseDb(), 'guilds', guildId, 'analysisRequests', selectedRequest.id, 'submissions'),
      orderBy('uploadedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        uploadedAt: d.data().uploadedAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
        reviewedAt: d.data().reviewedAt?.toDate() || undefined,
      })) as AnalysisSubmission[];
      setSubmissions(items);
    });

    return unsub;
  }, [guildId, selectedRequest]);

  // Get guild members
  const [guildMembers, setGuildMembers] = useState<string[]>([]);
  useEffect(() => {
    if (!guildId) return;
    const unsub = onSnapshot(doc(getFirebaseDb(), 'guilds', guildId), (snap) => {
      if (snap.exists()) {
        setGuildMembers(snap.data().memberOwnerIds || []);
      }
    });
    return unsub;
  }, [guildId]);

  // Calculate stats
  const stats = {
    total: guildMembers.length,
    submitted: submissions.length,
    pending: guildMembers.length - submissions.length,
    reviewed: submissions.filter((s) => s.reviewStatus === 'completed').length,
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return sub.status === 'uploading';
    if (filter === 'uploaded') return sub.status === 'uploaded';
    if (filter === 'reviewed') return sub.reviewStatus === 'completed';
    return true;
  });

  // Get members who submitted and who didn't
  const submittedUserIds = new Set(submissions.map((s) => s.userId));
  const pendingMembers = guildMembers.filter((id) => !submittedUserIds.has(id));
  const submittedMembers = guildMembers.filter((id) => submittedUserIds.has(id));

  if (selectedSubmission) {
    return (
      <VideoReview
        guildId={guildId}
        requestId={selectedRequest!.id}
        submission={selectedSubmission}
        memberNames={memberNames}
        onBack={() => setSelectedSubmission(null)}
      />
    );
  }

  if (selectedRequest) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRequest(null)}
            className="text-muted hover:text-white transition-colors"
          >
            ← {t('analysisBack')}
          </button>
          <h3 className="text-white font-heading font-semibold">{selectedRequest.title}</h3>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('analysisMembers'), value: stats.total, icon: Users, color: 'text-blue-400' },
            { label: t('analysisSubmitted'), value: stats.submitted, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: t('analysisPending'), value: stats.pending, icon: Clock, color: 'text-yellow-400' },
            { label: t('analysisReviewed'), value: stats.reviewed, icon: Eye, color: 'text-accent' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} className={stat.color} />
              </div>
              <p className="text-2xl font-heading font-bold text-white">{stat.value}</p>
              <p className="text-muted text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all' as const, label: t('analysisFilterAll') },
            { id: 'pending' as const, label: t('analysisFilterPending') },
            { id: 'uploaded' as const, label: t('analysisFilterUploaded') },
            { id: 'reviewed' as const, label: t('analysisFilterReviewed') },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                filter === f.id
                  ? 'bg-accent/15 text-white border border-accent/30'
                  : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const memberName = memberNames[sub.userId] || sub.userId.slice(0, 8);
            return (
              <motion.div
                key={sub.id}
                variants={fadeUp}
                className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4 hover:border-accent/30 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedSubmission(sub)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{memberName}</p>
                      <p className="text-muted text-sm">{sub.originalFileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sub.reviewStatus === 'completed' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {t('analysisReviewed')}
                      </span>
                    )}
                    {sub.overallScore !== undefined && (
                      <span className="text-sm font-medium text-white">
                        {sub.overallScore.toFixed(1)}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredSubmissions.length === 0 && (
            <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-8 text-center">
              <Eye size={48} className="mx-auto text-muted mb-4" />
              <p className="text-white font-heading font-semibold">{t('analysisNoSubmissions')}</p>
              <p className="text-muted mt-1">{t('analysisNoSubmissionsDesc')}</p>
            </div>
          )}
        </div>

        {/* Pending Members */}
        {pendingMembers.length > 0 && (
          <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4">
            <h4 className="text-white font-heading font-semibold mb-3">{t('analysisPendingMembers')}</h4>
            <div className="flex flex-wrap gap-2">
              {pendingMembers.map((id) => (
                <span
                  key={id}
                  className="text-sm px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400"
                >
                  {memberNames[id] || id.slice(0, 8)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Request list view
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-heading font-semibold">{t('analysisReviewList')}</h3>
        <p className="text-muted text-sm mt-1">{t('analysisReviewListDesc')}</p>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const typeConfig = ANALYSIS_TYPE_CONFIG[request.type] || ANALYSIS_TYPE_CONFIG.other;

          return (
            <motion.div
              key={request.id}
              variants={fadeUp}
              className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4 hover:border-accent/30 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${typeConfig.color}20` }}
                  >
                    {typeConfig.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{request.title}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                      >
                        {typeConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted">
                      {request.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(request.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      <span className={cn(
                        'px-2 py-0.5 rounded',
                        request.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted'
                      )}>
                        {request.status === 'open' ? t('analysisOpen') : t('analysisClosed')}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted" />
              </div>
            </motion.div>
          );
        })}

        {requests.length === 0 && (
          <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-8 text-center">
            <BarChart3 size={48} className="mx-auto text-muted mb-4" />
            <p className="text-white font-heading font-semibold">{t('analysisNoRequests')}</p>
            <p className="text-muted mt-1">{t('analysisNoRequestsDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
