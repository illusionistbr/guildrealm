'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { useRecruitmentSettings } from '@/lib/groups/hooks';
import type { ApplicationAnswer } from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ShieldCheck,
  UserX,
  X,
} from 'lucide-react';

type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

type GuildApplication = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantCharacterId?: string | null;
  status: ApplicationStatus;
  answers: ApplicationAnswer[];
  submittedAt?: Date;
  updatedAt?: Date;
};

function tsToDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val && typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return undefined;
}

export function ApplicationsView({ guildId }: { guildId: string }) {
  const t = useTranslations('GuildPanel');
  const { settings } = useRecruitmentSettings(guildId);

  const [applications, setApplications] = useState<GuildApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    const unsub = onSnapshot(
      query(
        collection(getFirebaseDb(), 'guilds', guildId, 'applications'),
        orderBy('submittedAt', 'desc'),
      ),
      (snap) => {
        const list: GuildApplication[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            applicantId: data.applicantId ?? '',
            applicantName: data.applicantName ?? 'Jogador',
            applicantCharacterId: data.applicantCharacterId ?? null,
            status: data.status ?? 'PENDING',
            answers: Array.isArray(data.answers) ? data.answers : [],
            submittedAt: tsToDate(data.submittedAt),
            updatedAt: tsToDate(data.updatedAt),
          });
        });
        setApplications(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  const pending = applications.filter((a) => a.status === 'PENDING');
  const history = applications.filter((a) => a.status !== 'PENDING');

  const questionTitles = new Map(
    (settings?.questions ?? []).map((q) => [q.id, q.title]),
  );

  const review = async (
    applicationId: string,
    decision: 'accepted' | 'rejected',
  ) => {
    setBusyId(applicationId);
    setError('');
    try {
      const fn = httpsCallable<
        { guildId: string; applicationId: string; decision: string },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'reviewGuildApplication');
      await fn({ guildId, applicationId, decision });
    } catch (err) {
      const e = err as { code?: string };
      setError(
        e?.code === 'functions/already-reviewed'
          ? t('applicationAlreadyReviewed')
          : t('applicationReviewError'),
      );
    }
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <ClipboardList size={14} className="text-accent" />
          {t('applicationsPending')}
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.5)] bg-[rgba(10,18,32,0.3)] p-6 text-center text-sm text-muted">
            {t('applicationsEmpty')}
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                questionTitles={questionTitles}
                busy={busyId === app.id}
                onAccept={() => review(app.id, 'accepted')}
                onReject={() => review(app.id, 'rejected')}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-accent" />
            {t('applicationsHistory')}
          </h2>
          <div className="space-y-2">
            {history.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.4)] bg-[rgba(10,18,32,0.4)] px-4 py-3"
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-lg border',
                    app.status === 'ACCEPTED'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-red-400 bg-red-500/10 border-red-500/20',
                  )}
                >
                  {app.status === 'ACCEPTED' ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <UserX size={12} />
                  )}
                  {app.status === 'ACCEPTED'
                    ? t('applicationAccepted')
                    : t('applicationRejected')}
                </span>
                <span className="flex-1 min-w-0 text-sm text-white truncate">
                  {app.applicantName}
                </span>
                <span className="text-xs text-muted shrink-0">
                  {app.submittedAt
                    ? new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(app.submittedAt)
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  questionTitles,
  busy,
  onAccept,
  onReject,
}: {
  app: GuildApplication;
  questionTitles: Map<string, string>;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useTranslations('GuildPanel');

  const answerLabel = (a: ApplicationAnswer) => {
    const title = questionTitles.get(a.questionId) ?? a.questionId;
    const value = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
    return { title, value };
  };

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="text-white font-heading font-bold truncate">
            {app.applicantName}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {app.submittedAt
              ? new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(app.submittedAt)
              : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {t('applicationAccept')}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            {t('applicationReject')}
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {app.answers.map((a) => {
          const { title, value } = answerLabel(a);
          if (!value) return null;
          return (
            <div key={a.questionId}>
              <p className="text-xs text-muted">{title}</p>
              <p className="text-sm text-white whitespace-pre-line">{value}</p>
            </div>
          );
        })}
        {app.answers.length === 0 && (
          <p className="text-sm text-muted">{t('applicationNoAnswers')}</p>
        )}
      </div>
    </div>
  );
}