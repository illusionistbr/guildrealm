'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import {
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Copy,
  ImagePlus,
  Shield,
  Users,
  X,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Option = { value: string; label: string };

const GAMES: Option[] = [{ value: 'aion2', label: 'Aion 2' }];

const FACTIONS: Option[] = [
  { value: 'elyos', label: 'Elyos' },
  { value: 'asmodians', label: 'Asmodians' },
];

type Recruitment = 'open' | 'closed';

type GuildForm = {
  name: string;
  game: string;
  faction: string;
  recruitment: Recruitment;
  region: string;
  languages: string[];
};

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function CreateGuildPage() {
  const t = useTranslations('GuildCreate');
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<'form' | 'preview' | 'created'>('form');
  const [form, setForm] = useState<GuildForm>({
    name: '',
    game: GAMES[0].value,
    faction: FACTIONS[0].value,
    recruitment: 'open',
    region: 'sa',
    languages: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdGuildId, setCreatedGuildId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const logoInput = useRef<HTMLInputElement>(null);

  const games = useMemo(() => t.raw('games') as Option[], [t]);
  const regions = useMemo(() => t.raw('regions') as Option[], [t]);
  const languages = useMemo(() => t.raw('languages') as Option[], [t]);

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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError('');
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError(t('logoInvalid'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(t('logoTooLarge'));
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError('');
    if (logoInput.current) logoInput.current.value = '';
  };

  const toggleLanguage = (value: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(value)
        ? prev.languages.filter((l) => l !== value)
        : [...prev.languages, value],
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    setStep('preview');
  };

  const handleCreate = async () => {
    if (!uid) return;
    setCreating(true);
    setError('');

    try {
      const db = getFirebaseDb();
      const guildRef = doc(collection(db, COLLECTIONS.GUILDS));

      let logoUrl: string | null = null;
      if (logoFile && logoPreview) {
        const ext = logoFile.name.split('.').pop() ?? 'png';
        const fileRef = storageRef(
          getFirebaseStorage(),
          `guild-logos/${guildRef.id}/logo.${ext}`,
        );
        await uploadBytes(fileRef, logoFile, {
          contentType: logoFile.type,
        });
        logoUrl = await getDownloadURL(fileRef);
      }

      await setDoc(guildRef, {
        ownerId: uid,
        ownerName: getFirebaseAuth().currentUser?.displayName?.trim() || null,
        name: form.name.trim(),
        game: form.game,
        faction: form.faction,
        recruitment: form.recruitment,
        region: form.region,
        languages: form.languages,
        logoUrl,
        members: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCreatedGuildId(guildRef.id);
      setStep('created');
    } catch {
      setError(t('createError'));
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdGuildId) return;
    const url = `${window.location.origin}/guilds/${createdGuildId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard indisponível: o link continua visível no campo
    }
  };

  const guildLink =
    typeof window !== 'undefined' && createdGuildId
      ? `${window.location.origin}/guilds/${createdGuildId}`
      : '';

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-2xl mx-auto"
    >
      {step !== 'form' && (
        <motion.div variants={fadeUp}>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
          >
            <ChevronLeft size={18} /> {t('cancel')}
          </Link>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white mt-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Shield size={20} className="text-accent" />
          </span>
          {step === 'form' && t('title')}
          {step === 'preview' && t('previewTitle')}
          {step === 'created' && t('createdTitle')}
        </h1>
        <p className="text-muted mt-1">
          {step === 'form' && t('subtitle')}
          {step === 'preview' && t('previewSub')}
          {step === 'created' && t('createdSub')}
        </p>
      </motion.div>

      {step === 'form' && (
        <FormStep
          t={t}
          form={form}
          setForm={setForm}
          games={games}
          regions={regions}
          languages={languages}
          logoFile={logoFile}
          logoPreview={logoPreview}
          logoError={logoError}
          error={error}
          ready={ready}
          logoInput={logoInput}
          onLogoSelect={handleLogoSelect}
          onLogoRemove={handleLogoRemove}
          onToggleLanguage={toggleLanguage}
          onSubmit={handleSubmitForm}
        />
      )}

      {step === 'preview' && (
        <PreviewStep
          t={t}
          form={form}
          games={games}
          regions={regions}
          languages={languages}
          logoPreview={logoPreview}
          creating={creating}
          error={error}
          onEdit={() => setStep('form')}
          onConfirm={handleCreate}
        />
      )}

      {step === 'created' && (
        <CreatedStep
          t={t}
          guildLink={guildLink}
          copied={copied}
          panelHref={
            createdGuildId
              ? `/panel/guilds/${createdGuildId}`
              : '/app/dashboard'
          }
          onCopy={handleCopyLink}
        />
      )}
    </motion.div>
  );
}

function FormStep({
  t,
  form,
  setForm,
  games,
  regions,
  languages,
  logoFile,
  logoPreview,
  logoError,
  error,
  ready,
  logoInput,
  onLogoSelect,
  onLogoRemove,
  onToggleLanguage,
  onSubmit,
}: {
  t: ReturnType<typeof useTranslations<'GuildCreate'>>;
  form: GuildForm;
  setForm: React.Dispatch<React.SetStateAction<GuildForm>>;
  games: Option[];
  regions: Option[];
  languages: Option[];
  logoFile: File | null;
  logoPreview: string | null;
  logoError: string;
  error: string;
  ready: boolean;
  logoInput: React.RefObject<HTMLInputElement | null>;
  onLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
  onToggleLanguage: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="mt-6 rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
    >
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('nameLabel')}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder={t('namePlaceholder')}
            maxLength={40}
            className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('logoLabel')}
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagePlus size={22} className="text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onLogoSelect}
              />
              <div className="flex items-center gap-2 flex-wrap">
                {!logoFile ? (
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-white text-xs hover:border-accent/40 transition-colors"
                  >
                    <ImagePlus size={14} /> {t('logoUpload')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => logoInput.current?.click()}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-white text-xs hover:border-accent/40 transition-colors"
                    >
                      <ImagePlus size={14} /> {t('logoChange')}
                    </button>
                    <button
                      type="button"
                      onClick={onLogoRemove}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                    >
                      <X size={14} /> {t('logoRemove')}
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('logoSub')}</p>
              {logoError && (
                <p className="text-xs text-red-400 mt-1.5">{logoError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('gameLabel')}
            </label>
            <Select
              value={form.game}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, game: value }))
              }
              options={games}
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('factionLabel')}
            </label>
            <Select
              value={form.faction}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, faction: value }))
              }
              options={FACTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('recruitmentLabel')}
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122]">
              {(['open', 'closed'] as Recruitment[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, recruitment: value }))
                  }
                  className={cn(
                    'h-9 rounded-md text-xs font-medium transition-colors',
                    form.recruitment === value
                      ? 'bg-accent text-white'
                      : 'text-muted hover:text-white',
                  )}
                >
                  {value === 'open'
                    ? t('recruitmentOpen')
                    : t('recruitmentClosed')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('regionLabel')}
            </label>
            <Select
              value={form.region}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, region: value }))
              }
              options={regions}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('languagesLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const selected = form.languages.includes(lang.value);
              return (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => onToggleLanguage(lang.value)}
                  className={cn(
                    'px-3 h-8 rounded-lg text-xs border transition-all duration-200',
                    selected
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white hover:border-accent/30',
                  )}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-1.5">{t('languagesHint')}</p>
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('submit')}
        </button>
      </form>
    </motion.div>
  );
}

function PreviewStep({
  t,
  form,
  games,
  regions,
  languages,
  logoPreview,
  creating,
  error,
  onEdit,
  onConfirm,
}: {
  t: ReturnType<typeof useTranslations<'GuildCreate'>>;
  form: GuildForm;
  games: Option[];
  regions: Option[];
  languages: Option[];
  logoPreview: string | null;
  creating: boolean;
  error: string;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const regionLabel = regions.find((r) => r.value === form.region)?.label;
  const selectedLanguages = languages.filter((l) =>
    form.languages.includes(l.value),
  );
  const factionLabel = FACTIONS.find((f) => f.value === form.faction)?.label;

  return (
    <motion.div variants={fadeUp} className="mt-6 space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Preview da página da guild */}
      <div className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)]">
        <div className="h-24 bg-gradient-to-r from-accent/25 via-accent/10 to-transparent border-b border-[rgba(38,51,86,0.3)]" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-[#0a1122] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-2xl">
                  {form.name.charAt(0).toUpperCase() || 'G'}
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h2 className="text-xl font-heading font-bold text-white truncate">
                {form.name || '—'}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                  {factionLabel}
                </span>
                <span className="text-xs text-muted">
                  {games.find((g) => g.value === form.game)?.label}
                </span>
                <span className="text-xs text-muted">{regionLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span
              className={cn(
                'text-xs px-2 py-1 rounded-lg font-medium',
                form.recruitment === 'open'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20',
              )}
            >
              {form.recruitment === 'open'
                ? t('recruiting')
                : t('closedRecruitment')}
            </span>
            {selectedLanguages.map((lang) => (
              <span
                key={lang.value}
                className="text-xs px-2 py-1 rounded-lg bg-[rgba(38,51,86,0.3)] text-muted"
              >
                {lang.label}
              </span>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(38,51,86,0.3)] flex items-center gap-4 text-sm">
            <span className="text-muted flex items-center gap-1.5">
              <Users size={14} /> 1
            </span>
            <span className="text-yellow-400 text-xs px-2 py-0.5 rounded bg-yellow-400/10">
              {t('leaderRole')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onEdit}
          disabled={creating}
          className="h-11 px-5 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm hover:text-white hover:border-accent/40 transition-colors disabled:opacity-50"
        >
          {t('editInfo')}
        </button>
        <button
          onClick={onConfirm}
          disabled={creating}
          className="flex-1 h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {creating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('creating')}
            </>
          ) : (
            <>
              <CheckCircle2 size={17} /> {t('confirmCreate')}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function CreatedStep({
  t,
  guildLink,
  copied,
  panelHref,
  onCopy,
}: {
  t: ReturnType<typeof useTranslations<'GuildCreate'>>;
  guildLink: string;
  copied: boolean;
  panelHref: string;
  onCopy: () => void;
}) {
  return (
    <motion.div variants={fadeUp} className="mt-6 space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
          <Check size={26} className="text-emerald-400" />
        </div>
        <h2 className="font-heading font-bold text-white text-xl">
          {t('createdTitle')}
        </h2>
        <p className="text-muted text-sm mt-1">{t('createdSub')}</p>

        <div className="mt-6 w-full">
          <p className="text-xs text-muted mb-1.5 text-left">
            {t('guildLink')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={guildLink}
              onFocus={(e) => e.target.select()}
              className="flex-1 h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-muted focus:outline-none focus:border-accent/50 transition-colors truncate"
            />
            <button
              onClick={onCopy}
              className={cn(
                'flex items-center gap-1.5 px-4 h-11 rounded-lg text-sm font-medium transition-colors',
                copied
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-accent text-white hover:bg-accent-hover',
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? t('linkCopied') : t('copyLink')}
            </button>
          </div>
        </div>
      </div>

      <Link
        href={panelHref}
        className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
      >
        <Shield size={17} /> {t('goToPanel')}
      </Link>
    </motion.div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 pl-3 pr-9 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0a1122]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
    </div>
  );
}
