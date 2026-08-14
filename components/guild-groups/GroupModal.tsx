'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { X, Users as UsersIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';
import { GROUP_TYPES } from '@/lib/groups/types';
import { GROUP_TYPE_ICONS } from './RoleIcon';

export const GROUP_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#0d9488',
  '#16a34a',
  '#ca8a04',
  '#dc2626',
  '#db2777',
  '#9333ea',
  '#ea580c',
];

interface GroupModalProps {
  initial?: {
    id: string;
    name: string;
    type: string;
    headerColor: string;
    maxPlayers: number;
  } | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: string;
    headerColor: string;
    maxPlayers: number;
  }) => Promise<void>;
}

export function GroupModal({ initial, onClose, onSubmit }: GroupModalProps) {
  const t = useTranslations('GuildGroups');

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<string>(initial?.type ?? 'OTHER');
  const [headerColor, setHeaderColor] = useState(
    initial?.headerColor ?? GROUP_COLORS[0],
  );
  const [maxPlayers, setMaxPlayers] = useState(String(initial?.maxPlayers ?? 5));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    const size = Number(maxPlayers);
    if (!trimmed) {
      setError(t('groupNameRequired'));
      return;
    }
    if (!Number.isFinite(size) || size < 1) {
      setError(t('groupSizeInvalid'));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: trimmed,
        type,
        headerColor,
        maxPlayers: Math.min(50, Math.max(1, size)),
      });
    } catch {
      setError(t('saveError'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <UsersIcon size={18} className="text-accent" />
            {initial ? t('editGroup') : t('newGroup')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('groupNamePlaceholder')}
              maxLength={40}
              className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">{t('type')}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(GROUP_TYPES).map((key) => {
                const Icon = GROUP_TYPE_ICONS[key];
                const active = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      'h-9 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-all',
                      active
                        ? 'border-accent bg-accent/20 text-white'
                        : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-muted hover:text-white',
                    )}
                  >
                    <Icon size={14} />
                    {t(`type_${key}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">{t('size')}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('headerColor')}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHeaderColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-transform',
                    headerColor === c
                      ? 'scale-110 ring-2 ring-white/70'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-[rgba(38,51,86,0.5)]"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-sm text-muted hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-accent hover:bg-accent/80 text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}