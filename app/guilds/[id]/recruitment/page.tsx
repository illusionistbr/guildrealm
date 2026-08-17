'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
} from '@/lib/admin/firebase/client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { useRecruitmentSettings, submitGuildApplication } from '@/lib/groups/hooks';
import type { ApplicationAnswer, RecruitmentSettings } from '@/lib/groups/types';
import { RecruitmentForm } from '@/components/recruitment/RecruitmentForm';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  Swords,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type GuildDoc = {
  id: string;
  name?: string;
  game?: string;
  members?: string[];
};

type CharacterDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  className?: string;
  game?: string;
  guildId?: string;
  createdAt?: { seconds: number };
};

export default function GuildRecruitmentPage() {
  const t = useTranslations('Recruitment');
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [guild, setGuild] = useState<GuildDoc | null>(null);
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [characters, setCharacters] = useState<CharacterDoc[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setAuthReady(true);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    let disposed = false;

    const load = async () => {
      const db = getFirebaseDb();
      try {
        const guildSnap = await getDoc(
          doc(db, COLLECTIONS.GUILDS, params.id),
        );
        if (!guildSnap.exists()) {
          if (!disposed) setGuild(null);
          return;
        }
        const g = { id: guildSnap.id, ...guildSnap.data() } as GuildDoc;
        if (!disposed) setGuild(g);

        const settingsSnap = await getDoc(
          doc(db, COLLECTIONS.GUILDS, params.id, 'settings', 'recruitment'),
        );
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (!disposed) {
            setSettings({
              enabled: data.enabled === true,
              message: data.message ?? '',
              questions: Array.isArray(data.questions) ? data.questions : [],
              passwordEnabled: data.passwordEnabled === true,
              passwordSet: data.passwordSet === true,
            });
          }
        }

        const uid = getFirebaseAuth().currentUser?.uid;
        if (uid) {
          const hasMember = await checkMember(db, uid, g);
          if (!disposed) setIsMember(hasMember);

          const available = await loadAvailableCharacters(db, uid, g);
          if (!disposed) {
            setCharacters(available);
            if (available.length === 1) {
              setSelectedCharacter(available[0].id);
            }
          }
        }
      } catch {
        if (!disposed) setGuild(null);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    load();
    return () => {
      disposed = true;
    };
  }, [authReady, params.id]);

  const handleSubmit = async (answers: ApplicationAnswer[]) => {
    if (!selectedCharacter) {
      setSubmitError(t('selectCharacterRequired'));
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitGuildApplication(params.id, selectedCharacter, answers);
      setSubmitted(true);
    } catch {
      setSubmitError(t('submitError'));
    }
    setSubmitting(false);
  };

  const handleJoinWithPassword = async () => {
    if (!selectedCharacter) {
      setJoinError(t('selectCharacterRequired'));
      return;
    }
    if (!passwordInput) {
      setJoinError(t('passwordRequired'));
      return;
    }
    setJoinBusy(true);
    setJoinError('');
    try {
      const fn = httpsCallable<
        { characterId: string; guildId: string; password: string },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'joinGuild');
      await fn({
        characterId: selectedCharacter,
        guildId: params.id,
        password: passwordInput,
      });
      setJoined(true);
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === 'functions/invalid-password') {
        setJoinError(t('invalidPassword'));
      } else if (e?.code === 'functions/password-required') {
        setJoinError(t('passwordRequired'));
      } else {
        setJoinError(t('joinError'));
      }
    }
    setJoinBusy(false);
  };

  const open = settings?.enabled === true;

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-accent" />
          </div>
          <p className="text-white font-heading font-semibold">{t('notFound')}</p>
          <Link
            href={`/guilds/${params.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-4 transition-colors"
          >
            <ChevronLeft size={16} /> {t('backToGuild')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050912]">
      <div className="shell py-10">
        <Link
          href={`/guilds/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-8"
        >
          <ChevronLeft size={18} /> {t('backToGuild')}
        </Link>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)] p-6"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <h1 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-accent" />
                {guild.name} — {t('pageTitle')}
              </h1>
              <span
                className={
                  open
                    ? 'text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5'
                    : 'text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5'
                }
              >
                <span
                  className={
                    open ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-red-400'
                  }
                />
                {open ? t('openBadge') : t('closedBadge')}
              </span>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <CheckCircle2 size={26} className="text-emerald-400" />
                </div>
                <h2 className="font-heading font-bold text-white text-lg">
                  {t('applicationSuccess')}
                </h2>
                <p className="text-sm text-muted mt-1 max-w-sm">
                  {t('applicationSuccessSub')}
                </p>
              </div>
            ) : joined ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <CheckCircle2 size={26} className="text-emerald-400" />
                </div>
                <h2 className="font-heading font-bold text-white text-lg">
                  {t('joinedTitle')}
                </h2>
                <p className="text-sm text-muted mt-1 max-w-sm">
                  {t('joinedSub')}
                </p>
              </div>
            ) : isMember && characters.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
                <CheckCircle2 size={16} /> {t('alreadyMember')}
              </div>
            ) : characters.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-4">
                  <Swords size={26} className="text-accent" />
                </div>
                <h2 className="font-heading font-bold text-white text-lg">
                  {t('noCharacterTitle')}
                </h2>
                <p className="text-sm text-muted mt-1 max-w-sm">
                  {t('noCharacterMessage')}
                </p>
                <Link
                  href="/app/characters/new"
                  className="mt-4 h-10 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
                >
                  {t('createCharacter')}
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-white font-medium mb-1.5">
                    {t('selectCharacter')}
                    <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <select
                    value={selectedCharacter}
                    onChange={(e) => setSelectedCharacter(e.target.value)}
                    className="w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5 appearance-none"
                  >
                    <option value="" className="bg-[#0a1122]">
                      {t('selectCharacterPlaceholder')}
                    </option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0a1122]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">
                    {t('selectCharacterHint')}
                  </p>
                </div>

                {settings?.passwordEnabled === true && (
                  <div className="rounded-lg border border-accent/25 bg-accent/5 p-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <KeyRound size={14} className="text-accent" />
                      {t('joinWithPassword')}
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      {t('passwordSectionSub')}
                    </p>
                    <div className="mt-3 relative">
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={t('passwordInputPlaceholder')}
                        className="w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5 pr-10"
                      />
                      <Lock
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                    </div>
                    {joinError && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle size={12} /> {joinError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleJoinWithPassword}
                      disabled={joinBusy}
                      className="mt-3 w-full h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {joinBusy ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Lock size={14} />
                      )}
                      {t('joinWithPassword')}
                    </button>
                  </div>
                )}

                {!open ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
                    <AlertCircle size={16} /> {t('closedMessage')}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {settings?.passwordEnabled === true && (
                      <div className="flex items-center gap-3">
                        <span className="h-px flex-1 bg-[rgba(38,51,86,0.3)]" />
                        <span className="text-xs text-muted">
                          {t('orApply')}
                        </span>
                        <span className="h-px flex-1 bg-[rgba(38,51,86,0.3)]" />
                      </div>
                    )}
                    <RecruitmentForm
                      settings={settings}
                      onSubmit={handleSubmit}
                      submitLabel={t('submitApplication')}
                      busy={submitting}
                      externalError={submitError}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

async function checkMember(
  db: ReturnType<typeof getFirebaseDb>,
  uid: string,
  guild: GuildDoc,
): Promise<boolean> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.CHARACTERS),
        where('ownerId', '==', uid),
        where('guildId', '==', guild.id),
      ),
    );
    return !snap.empty;
  } catch {
    return false;
  }
}

async function loadAvailableCharacters(
  db: ReturnType<typeof getFirebaseDb>,
  uid: string,
  guild: GuildDoc,
): Promise<CharacterDoc[]> {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.CHARACTERS), where('ownerId', '==', uid)),
    );
    const list: CharacterDoc[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.guildId) return;
      if (guild.game && data.game && guild.game !== data.game) return;
      list.push({ id: d.id, ...data } as CharacterDoc);
    });
    return list.sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
    );
  } catch {
    return [];
  }
}