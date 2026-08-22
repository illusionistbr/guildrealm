'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import { getPlayUrl, addComment, saveReview } from '@/lib/analyses/hooks';
import type { AnalysisSubmission, AnalysisComment } from '@/lib/analyses/types';
import {
  ArrowLeft,
  MessageSquare,
  Star,
  Save,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
} from 'lucide-react';

interface VideoReviewProps {
  guildId: string;
  requestId: string;
  submission: AnalysisSubmission;
  memberNames: Record<string, string>;
  onBack: () => void;
}

const SCORE_CATEGORIES = [
  { id: 'mechanics', label: 'Mecânica' },
  { id: 'positioning', label: 'Posicionamento' },
  { id: 'decision', label: 'Tomada de decisão' },
  { id: 'teamwork', label: 'Trabalho em equipe' },
  { id: 'communication', label: 'Comunicação' },
];

export function VideoReview({
  guildId,
  requestId,
  submission,
  memberNames,
  onBack,
}: VideoReviewProps) {
  const t = useTranslations('GuildPanel');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [comments, setComments] = useState<AnalysisComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(
    submission.scores || {}
  );
  const [generalFeedback, setGeneralFeedback] = useState(submission.generalFeedback || '');
  const [strongPoints, setStrongPoints] = useState(submission.strongPoints || '');
  const [improvementPoints, setImprovementPoints] = useState(submission.improvementPoints || '');
  const [recommendation, setRecommendation] = useState(submission.recommendation || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const memberName = memberNames[submission.userId] || submission.userId.slice(0, 8);

  // Load video URL
  useEffect(() => {
    if (!guildId || !requestId || !submission.id) return;

    const loadUrl = async () => {
      try {
        const result = await getPlayUrl({
          guildId,
          requestId,
          submissionId: submission.id,
        });
        setVideoUrl(result.url);
      } catch (error) {
        console.error('Failed to load video:', error);
      } finally {
        setLoadingVideo(false);
      }
    };

    loadUrl();
  }, [guildId, requestId, submission.id]);

  // Load comments
  useEffect(() => {
    if (!guildId || !requestId || !submission.id) return;

    const q = query(
      collection(
        getFirebaseDb(),
        'guilds',
        guildId,
        'analysisRequests',
        requestId,
        'submissions',
        submission.id,
        'comments'
      ),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as AnalysisComment[];
      setComments(items);
    });

    return unsub;
  }, [guildId, requestId, submission.id]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (timestamp: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = timestamp;
      video.play();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment({
        guildId,
        requestId,
        submissionId: submission.id,
        timestamp: currentTime,
        text: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleScoreChange = (categoryId: string, value: number) => {
    setScores((prev) => ({ ...prev, [categoryId]: value }));
  };

  const calculateOverallScore = () => {
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await saveReview({
        guildId,
        requestId,
        submissionId: submission.id,
        scores,
        generalFeedback,
        strongPoints,
        improvementPoints,
        recommendation,
        overallScore: calculateOverallScore(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save review:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loadingVideo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-white font-heading font-semibold">{memberName}</h3>
          <p className="text-muted text-sm">{submission.originalFileName}</p>
        </div>
      </div>

      {/* Video Player */}
      <div className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full aspect-video"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center bg-[#0a1122]">
            <p className="text-muted">{t('analysisVideoNotAvailable')}</p>
          </div>
        )}
      </div>

      {/* Timeline Comments */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4">
        <h4 className="text-white font-heading font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={18} />
          {t('analysisComments')}
        </h4>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg bg-[#0a1122] hover:bg-[rgba(109,40,217,0.08)] transition-colors cursor-pointer"
              onClick={() => handleSeek(comment.timestamp)}
            >
              <span className="text-accent font-mono text-sm shrink-0">
                {formatTime(comment.timestamp)}
              </span>
              <p className="text-white text-sm">{comment.text}</p>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('analysisAddComment')}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('analysisAdd')}
          </button>
        </div>
      </div>

      {/* Score Form */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4">
        <h4 className="text-white font-heading font-semibold mb-4 flex items-center gap-2">
          <Star size={18} />
          {t('analysisScore')}
        </h4>

        <div className="space-y-4">
          {SCORE_CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-center gap-4">
              <span className="text-white text-sm w-40">{category.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScoreChange(category.id, value)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200',
                      scores[category.id] === value
                        ? 'bg-accent text-white'
                        : 'bg-[#0a1122] text-muted hover:text-white hover:bg-accent/20'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="text-white font-medium w-8 text-right">
                {scores[category.id] || '-'}
              </span>
            </div>
          ))}

          {/* Overall Score */}
          <div className="flex items-center gap-4 pt-4 border-t border-[rgba(38,51,86,0.3)]">
            <span className="text-white font-heading font-semibold w-40">{t('analysisOverallScore')}</span>
            <span className="text-2xl font-heading font-bold text-accent">
              {calculateOverallScore().toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4">
        <h4 className="text-white font-heading font-semibold mb-4">{t('analysisFeedback')}</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              {t('analysisGeneralFeedback')}
            </label>
            <textarea
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              placeholder={t('analysisGeneralFeedbackPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              {t('analysisStrongPoints')}
            </label>
            <textarea
              value={strongPoints}
              onChange={(e) => setStrongPoints(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              placeholder={t('analysisStrongPointsPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              {t('analysisImprovementPoints')}
            </label>
            <textarea
              value={improvementPoints}
              onChange={(e) => setImprovementPoints(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              placeholder={t('analysisImprovementPointsPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              {t('analysisRecommendation')}
            </label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              placeholder={t('analysisRecommendationPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveReview}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200',
            saved
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={18} />
          ) : (
            <Save size={18} />
          )}
          {saved ? t('analysisSaved') : t('analysisSaveReview')}
        </button>
      </div>
    </div>
  );
}
