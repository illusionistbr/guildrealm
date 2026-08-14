'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import { DEFAULT_ROLES } from '@/lib/groups/types';
import {
  ChevronLeft,
  ChevronDown,
  Sword,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type ClassOption = { value: string; label: string; icon?: string };

export default function CreateCharacterPage() {
  const t = useTranslations('CharacterCreate');
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [className, setClassName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(!!editId);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const editing = !!editId;

  const gameOptions = useMemo(() => t.raw('games') as ClassOption[], [t]);
  const classOptions = useMemo(() => t.raw('classes') as ClassOption[], [t]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUid(user.uid);
      setReady(true);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    const load = async () => {
      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.CHARACTERS, editId),
        );
        if (!active) return;
        if (!snap.exists()) {
          setError(t('notFound'));
          return;
        }
        const data = snap.data();
        setName(data.name ?? '');
        setGame(data.game ?? '');
        setClassName(data.className ?? '');
        setRole(data.role ?? '');
        setLevel(typeof data.level === 'number' ? data.level : 1);
      } catch {
        if (active) setError(t('loadError'));
      } finally {
        if (active) setLoadingDoc(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [editId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }

    if (!uid) return;

    setLoading(true);
    try {
      const db = getFirebaseDb();
      const payload = {
        ownerId: uid,
        name: name.trim(),
        className: (className || classOptions[0]?.value) ?? 'gladiator',
        game: (game || gameOptions[0]?.value) ?? 'aion2',
        role: role || null,
        level: Math.max(1, level),
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.CHARACTERS, editId), payload);
      } else {
        await addDoc(collection(db, COLLECTIONS.CHARACTERS), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      router.push('/app/dashboard');
    } catch {
      setError(t('createError'));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-xl mx-auto"
    >
      <motion.div variants={fadeUp}>
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={18} /> {editing ? t('back') : t('cancel')}
        </Link>
        <h1 className="text-2xl font-heading font-bold text-white mt-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Sword size={20} className="text-accent" />
          </span>
          {editing ? t('editTitle') : t('title')}
        </h1>
        <p className="text-muted mt-1">
          {editing ? t('editSubtitle') : t('subtitle')}
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-6 rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        {loadingDoc ? (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 size={22} className="animate-spin mr-2" />
            {t('loading')}
          </div>
        ) : (
        <>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('gameLabel')}
            </label>
            <div className="relative">
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full h-11 pl-3 pr-9 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
              >
                {gameOptions.map((g) => (
                  <option
                    key={g.value}
                    value={g.value}
                    className="bg-[#0a1122]"
                  >
                    {g.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={30}
              className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('classLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {classOptions.map((c) => {
                const selected = className === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setClassName(c.value)}
                    className={cn(
                      'flex items-center gap-2.5 h-11 px-3 rounded-lg border text-sm transition-all duration-200',
                      selected
                        ? 'bg-accent/15 border-accent/40 text-white'
                        : 'bg-[#0a1122] border-[rgba(38,51,86,0.5)] text-muted hover:text-white hover:border-accent/30',
                    )}
                  >
                    {c.icon && (
                      <img
                        src={c.icon}
                        alt={c.label}
                        className="w-7 h-7 rounded-md object-cover"
                      />
                    )}
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('roleLabel')}
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 pl-3 pr-9 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
              >
                <option value="" className="bg-[#0a1122]">
                  {t('rolePlaceholder')}
                </option>
                {DEFAULT_ROLES.map((r) => (
                  <option
                    key={r.name}
                    value={r.name}
                    className="bg-[#0a1122]"
                  >
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('cpLabel')}
            </label>
            <input
              type="number"
              min={1}
              max={999999}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              placeholder="1"
              className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? editing
                ? t('saving')
                : t('creating')
              : editing
                ? t('save')
                : t('submit')}
          </button>
        </form>
        </>
        )}
      </motion.div>
    </motion.div>
  );
}
