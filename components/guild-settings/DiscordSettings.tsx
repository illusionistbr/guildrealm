'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import { AlertCircle, CalendarDays, Check, CheckCircle2, Gem, Loader2, Megaphone, MessagesSquare, Send, Trash2 } from 'lucide-react';

const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';

type DiscordMode = 'single' | 'separate';

export function DiscordSettings({ guildId }: { guildId: string }) {
  const t = useTranslations('GuildPanel');
  const [mode, setMode] = useState<DiscordMode>('single');
  const [url, setUrl] = useState('');
  const [eventsUrl, setEventsUrl] = useState('');
  const [lootUrl, setLootUrl] = useState('');
  const [noticesUrl, setNoticesUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    getDoc(doc(getFirebaseDb(), COLLECTIONS.GUILDS, guildId, 'settings', 'discord'))
      .then((snap) => {
        if (!disposed && snap.exists()) {
          const data = snap.data();
          setMode(data.mode === 'separate' ? 'separate' : 'single');
          setUrl(data.webhookUrl ?? '');
          setEventsUrl(data.eventsUrl ?? '');
          setLootUrl(data.lootUrl ?? '');
          setNoticesUrl(data.noticesUrl ?? '');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!disposed) setLoaded(true);
      });
    return () => {
      disposed = true;
    };
  }, [guildId]);

  const isValid = (value: string) => value.trim().startsWith(WEBHOOK_PREFIX);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    if (mode === 'single') {
      if (!isValid(url)) {
        setError(t('discordUrlInvalid'));
        return;
      }
    } else if (!isValid(eventsUrl) && !isValid(lootUrl) && !isValid(noticesUrl)) {
      setError(t('discordUrlInvalid'));
      return;
    }
    setSaving(true);
    try {
      const fn = httpsCallable<
        {
          guildId: string;
          mode: DiscordMode;
          webhookUrl: string;
          eventsUrl: string;
          lootUrl: string;
          noticesUrl: string;
        },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'saveDiscordSettings');
      await fn({
        guildId,
        mode,
        webhookUrl: url.trim(),
        eventsUrl: eventsUrl.trim(),
        lootUrl: lootUrl.trim(),
        noticesUrl: noticesUrl.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('discordError'));
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const fn = httpsCallable<{ guildId: string; clear: boolean }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'saveDiscordSettings',
      );
      await fn({ guildId, clear: true });
      setUrl('');
      setEventsUrl('');
      setLootUrl('');
      setNoticesUrl('');
      setMode('single');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('discordError'));
    }
    setSaving(false);
  };

  const handleTest = async (key: string, value: string) => {
    const trimmed = value.trim();
    if (!isValid(trimmed)) {
      setError(t('discordUrlInvalid'));
      return;
    }
    setTesting(key);
    setError('');
    setTested(false);
    try {
      const fn = httpsCallable<{ guildId: string; webhookUrl: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'testDiscordWebhook',
      );
      await fn({ guildId, webhookUrl: trimmed });
      setTested(true);
      setTimeout(() => setTested(false), 5000);
    } catch {
      setError(t('discordError'));
    }
    setTesting(null);
  };

  const hasAnyUrl = url.trim() || eventsUrl.trim() || lootUrl.trim() || noticesUrl.trim();

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> {t('discordSaved')}
        </div>
      )}
      {tested && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> {t('discordTested')}
        </div>
      )}

      <section className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessagesSquare size={14} className="text-accent" />
          {t('discordTitle')}
        </h3>
        <p className="text-xs text-muted mt-1">{t('discordSub')}</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={cn(
              'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors',
              mode === 'single'
                ? 'bg-accent/10 border-accent/40'
                : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] hover:border-accent/30',
            )}
          >
            <MessagesSquare size={16} className={mode === 'single' ? 'text-accent mt-0.5' : 'text-muted mt-0.5'} />
            <span>
              <span className="block text-sm font-medium text-white">{t('discordModeSingle')}</span>
              <span className="block text-xs text-muted mt-0.5">{t('discordModeSingleSub')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('separate')}
            className={cn(
              'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors',
              mode === 'separate'
                ? 'bg-accent/10 border-accent/40'
                : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] hover:border-accent/30',
            )}
          >
            <Megaphone size={16} className={mode === 'separate' ? 'text-accent mt-0.5' : 'text-muted mt-0.5'} />
            <span>
              <span className="block text-sm font-medium text-white">{t('discordModeSeparate')}</span>
              <span className="block text-xs text-muted mt-0.5">{t('discordModeSeparateSub')}</span>
            </span>
          </button>
        </div>

        {!loaded && <p className="text-xs text-muted mt-3">{t('discordLoading')}</p>}

        {loaded && mode === 'single' && (
          <div className="mt-3 space-y-2">
            <label className="block text-sm text-white font-medium">
              {t('discordWebhookLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('discordWebhookPlaceholder')}
                className="flex-1 min-w-0 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5"
              />
              <button
                type="button"
                onClick={() => handleTest('single', url)}
                disabled={testing !== null}
                title={t('discordTest')}
                className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[rgba(38,51,86,0.5)] text-xs text-muted hover:text-white hover:border-accent/40 transition-colors disabled:opacity-50"
              >
                {testing === 'single' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {t('discordTest')}
              </button>
            </div>
            <p className="text-xs text-muted">{t('discordWebhookHint')}</p>
            {!url.trim() && (
              <p className="text-xs text-yellow-400/80 flex items-center gap-1">
                <AlertCircle size={12} /> {t('discordEmpty')}
              </p>
            )}
          </div>
        )}

        {loaded && mode === 'separate' && (
          <div className="mt-3 space-y-4">
            <ChannelField
              icon={<CalendarDays size={14} className="text-accent" />}
              label={t('discordEventsLabel')}
              hint={t('discordEventsSub')}
              value={eventsUrl}
              onChange={setEventsUrl}
              placeholder={t('discordWebhookPlaceholder')}
              onTest={() => handleTest('events', eventsUrl)}
              testing={testing === 'events'}
              disabled={testing !== null}
              testLabel={t('discordTest')}
            />
            <ChannelField
              icon={<Gem size={14} className="text-accent" />}
              label={t('discordLootLabel')}
              hint={t('discordLootSub')}
              value={lootUrl}
              onChange={setLootUrl}
              placeholder={t('discordWebhookPlaceholder')}
              onTest={() => handleTest('loot', lootUrl)}
              testing={testing === 'loot'}
              disabled={testing !== null}
              testLabel={t('discordTest')}
            />
            <ChannelField
              icon={<Megaphone size={14} className="text-accent" />}
              label={t('discordNoticesLabel')}
              hint={t('discordNoticesSub')}
              value={noticesUrl}
              onChange={setNoticesUrl}
              placeholder={t('discordWebhookPlaceholder')}
              onTest={() => handleTest('notices', noticesUrl)}
              testing={testing === 'notices'}
              disabled={testing !== null}
              testLabel={t('discordTest')}
            />
            {!eventsUrl.trim() && !lootUrl.trim() && !noticesUrl.trim() && (
              <p className="text-xs text-yellow-400/80 flex items-center gap-1">
                <AlertCircle size={12} /> {t('discordEmpty')}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            {saving ? t('discordSaving') : t('discordSave')}
          </button>
          {hasAnyUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> {t('discordRemove')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ChannelField({
  icon,
  label,
  hint,
  value,
  onChange,
  placeholder,
  onTest,
  testing,
  disabled,
  testLabel,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onTest: () => void;
  testing: boolean;
  disabled: boolean;
  testLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[#0a1122]/60 p-3">
      <label className="flex items-center gap-2 text-sm text-white font-medium">
        {icon} {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5"
        />
        <button
          type="button"
          onClick={onTest}
          disabled={disabled}
          title={testLabel}
          className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[rgba(38,51,86,0.5)] text-xs text-muted hover:text-white hover:border-accent/40 transition-colors disabled:opacity-50"
        >
          {testing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {testLabel}
        </button>
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
