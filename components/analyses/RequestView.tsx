'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/admin/utils/cn';
import { createAnalysisRequest, updateAnalysisRequestStatus } from '@/lib/analyses/hooks';
import {
  ANALYSIS_TYPES,
  ANALYSIS_TYPE_CONFIG,
  type AnalysisType,
} from '@/lib/analyses/types';
import {
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  FileVideo,
  Trash2,
} from 'lucide-react';

interface RequestViewProps {
  guildId: string;
  uid: string | null;
  isLeader: boolean;
}

export function RequestView({ guildId, uid, isLeader }: RequestViewProps) {
  const t = useTranslations('GuildPanel');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [game, setGame] = useState('');
  const [type, setType] = useState<AnalysisType>('gvg');
  const [eventDate, setEventDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxVideoSize, setMaxVideoSize] = useState(2); // GB
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !title || !game) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await createAnalysisRequest({
        guildId,
        title,
        description,
        game,
        type,
        eventDate: eventDate || undefined,
        deadline: deadline || undefined,
        maxVideoSize: maxVideoSize * 1024 * 1024 * 1024,
        allowMultipleSubmissions: allowMultiple,
      });

      setSuccess(true);
      setShowForm(false);
      setTitle('');
      setDescription('');
      setGame('');
      setType('gvg');
      setEventDate('');
      setDeadline('');
      setMaxVideoSize(2);
      setAllowMultiple(false);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || t('analysisRequestError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-heading font-semibold">{t('analysisRequestList')}</h3>
          <p className="text-muted text-sm mt-1">{t('analysisRequestListDesc')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            showForm
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t('analysisCancel') : t('analysisNewRequest')}
        </button>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          >
            <CheckCircle2 size={18} />
            {t('analysisRequestCreated')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  {t('analysisTitle')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('analysisTitlePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  {t('analysisDescription')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('analysisDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
                />
              </div>

              {/* Game */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  {t('analysisGame')} *
                </label>
                <input
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder={t('analysisGamePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  {t('analysisType')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(ANALYSIS_TYPE_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setType(key as AnalysisType)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        type === key
                          ? 'border-2 text-white'
                          : 'border border-[rgba(38,51,86,0.5)] text-muted hover:text-white hover:border-accent/30'
                      )}
                      style={type === key ? { borderColor: config.color, backgroundColor: `${config.color}20` } : {}}
                    >
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">
                    {t('analysisEventDate')}
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">
                    {t('analysisDeadline')}
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-white focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              </div>

              {/* Max Video Size */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  {t('analysisMaxVideoSize')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={maxVideoSize}
                    onChange={(e) => setMaxVideoSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-medium w-16 text-right">
                    {maxVideoSize} GB
                  </span>
                </div>
              </div>

              {/* Allow Multiple */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAllowMultiple(!allowMultiple)}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors duration-200',
                    allowMultiple ? 'bg-accent' : 'bg-[rgba(38,51,86,0.5)]'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full bg-white transition-transform duration-200',
                      allowMultiple ? 'translate-x-5' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-white text-sm">{t('analysisAllowMultiple')}</span>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(38,51,86,0.3)]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg text-sm text-muted hover:text-white transition-colors"
                >
                  {t('analysisCancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !title || !game}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {t('analysisCreateRequest')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
