'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import {
  GuildRank,
  RANK_PERMISSIONS,
  ROLE_COLORS,
  type RankPermission,
} from '@/lib/groups/types';
import { useGuildRanks } from '@/lib/groups/hooks';
import { cn } from '@/lib/admin/utils/cn';
import { ConfirmDialog } from '@/components/guild-groups/ConfirmDialog';

interface RanksTabProps {
  guildId: string;
}

export function RanksTab({ guildId }: RanksTabProps) {
  const t = useTranslations('GuildPanel');
  const { ranks, loading, createRank, updateRank, deleteRank } =
    useGuildRanks(guildId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GuildRank | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0].value);
  const [permissions, setPermissions] = useState<
    Partial<Record<RankPermission, boolean>>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GuildRank | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  const permissionLabels = t.raw(
    'rankPermissionsLabels',
  ) as { value: string; label: string }[];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(ROLE_COLORS[0].value);
    setPermissions({});
    setError('');
    setFormOpen(true);
  };

  const openEdit = (rank: GuildRank) => {
    setEditing(rank);
    setName(rank.name);
    setColor(rank.color);
    setPermissions({ ...rank.permissions });
    setError('');
    setFormOpen(true);
  };

  const togglePermission = (key: RankPermission) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('rankNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateRank(editing.id, {
          name: name.trim(),
          color,
          permissions,
        });
      } else {
        await createRank({ name: name.trim(), color, permissions });
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      setError(t('rankSaveError'));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRank(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError(false);
    } catch {
      setDeleteError(true);
    }
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <X size={16} /> {t('rankDeleteError')}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">
          {t('ranksHint')}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> {t('newRank')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {ranks.map((rank) => (
            <div
              key={rank.id}
              className="flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] px-3 py-2.5"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: rank.color }}
              />
              <span className="text-sm text-white flex-1 truncate">
                {rank.name}
              </span>
              <span className="hidden sm:flex text-[10px] text-muted px-1.5 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.4)] items-center gap-1">
                <Check size={9} />
                {Object.values(rank.permissions).filter(Boolean).length}{' '}
                {t('rankPermissions')}
              </span>
              {rank.isDefault && (
                <span className="text-[10px] text-muted px-1.5 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.4)]">
                  {t('rankDefault')}
                </span>
              )}
              <button
                onClick={() => openEdit(rank)}
                title={t('editRank')}
                className="p-1.5 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
              >
                <Pencil size={13} />
              </button>
              {!rank.isDefault && (
                <button
                  onClick={() => setDeleteTarget(rank)}
                  title={t('deleteRankTitle')}
                  className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-[rgba(38,51,86,0.3)] transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4 space-y-4">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            {editing ? t('editRank') : t('newRank')}
          </p>

          <div>
            <label className="block text-xs text-muted mb-1">{t('rankName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rankNamePlaceholder')}
              maxLength={30}
              className="w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t('rankColor')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-7 h-7 rounded-lg transition-transform',
                    color === c.value
                      ? 'scale-110 ring-2 ring-white/70'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">
              {t('rankPermissions')}
            </label>
            <div className="space-y-1.5">
              {permissionLabels.map((p) => {
                const key = p.value as RankPermission;
                const active = !!permissions[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePermission(key)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 h-9 rounded-lg border text-xs transition-all',
                      active
                        ? 'bg-accent/15 border-accent/40 text-white'
                        : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                    )}
                  >
                    <span>{p.label}</span>
                    <span
                      className={cn(
                        'w-4 h-4 rounded flex items-center justify-center border transition-colors',
                        active
                          ? 'bg-accent border-accent'
                          : 'border-[rgba(38,51,86,0.6)]',
                      )}
                    >
                      {active && <Check size={11} className="text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-9 rounded-lg bg-accent hover:bg-accent/80 text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {t('saveRank')}
            </button>
            <button
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                setError('');
              }}
              className="h-9 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white transition-colors"
            >
              {t('cancelRank')}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('rankDeleteTitle')}
          message={t('rankDeleteMessage', { name: deleteTarget.name })}
          danger
          confirmLabel={t('deleteRankTitle')}
          onConfirm={handleDelete}
          onClose={() => {
            setDeleteTarget(null);
            setDeleteError(false);
          }}
        />
      )}
    </div>
  );
}