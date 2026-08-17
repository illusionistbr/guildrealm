'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { AlertCircle, Check, CheckCircle2, Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';

const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';

export function DiscordSettings({ guildId }: { guildId: string }) {
  const t = useTranslations('GuildPanel');
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    getDoc(doc(getFirebaseDb(), COLLECTIONS.GUILDS, guildId, 'settings', 'discord'))
      .then((snap) => {
        if (!disposed && snap.exists()) {
          setUrl(snap.data().webhookUrl ?? '');
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
    const value = url.trim();
    if (!isValid(value)) {
      setError(t('discordUrlInvalid'));
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await setDoc(doc(getFirebaseDb(), COLLECTIONS.GUILDS, guildId, 'settings', 'discord'), {
        webhookUrl: value,
        updatedAt: serverTimestamp(),
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
      await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.GUILDS, guildId, 'settings', 'discord'));
      setUrl('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('discordError'));
    }
    setSaving(false);
  };

  const handleTest = async () => {
    const value = url.trim();
    if (!isValid(value)) {
      setError(t('discordUrlInvalid'));
      return;
    }
    setTesting(true);
    setError('');
    setTested(false);
    try {
      const fn = httpsCallable<{ guildId: string; webhookUrl: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'testDiscordWebhook',
      );
      await fn({ guildId, webhookUrl: value });
      setTested(true);
      setTimeout(() => setTested(false), 5000);
    } catch {
      setError(t('discordError'));
    }
    setTesting(false);
  };

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

        <div className="mt-3 space-y-2">
          <label className="block text-sm text-white font-medium">
            {t('discordWebhookLabel')}
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('discordWebhookPlaceholder')}
            className="w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5"
          />
          <p className="text-xs text-muted">{t('discordWebhookHint')}</p>
          {!loaded && <p className="text-xs text-muted">{t('discordLoading')}</p>}
          {loaded && !url.trim() && (
            <p className="text-xs text-yellow-400/80 flex items-center gap-1">
              <AlertCircle size={12} /> {t('discordEmpty')}
            </p>
          )}
        </div>

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
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {testing ? t('discordTesting') : t('discordTest')}
          </button>
          {url.trim() && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} /> {t('discordRemove')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}