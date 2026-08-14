'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { GuildPreset, GROUP_TYPES, GroupType, PresetGroup } from '@/lib/groups/types';
import { useGuildPresets, useGuildRoles } from '@/lib/groups/hooks';
import { cn } from '@/lib/admin/utils/cn';

const PRESET_ICONS = ['📅', '🛡️', '⚔️', '🎯', '🏰', '🐉', '🏆', '🔥', '⚡', '🌟', '🧙', '🗡️'];

const PRESET_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#0d9488',
  '#16a34a',
  '#ca8a04',
  '#dc2626',
  '#db2777',
  '#ea580c',
];

interface PresetModalProps {
  guildId: string;
  initial?: GuildPreset | null;
  onClose: () => void;
}

interface DraftGroup {
  id: string;
  name: string;
  maxPlayers: number;
  roles: { roleId: string; quantity: number }[];
}

let idCounter = 0;
const nextId = () => `g${Date.now()}_${idCounter++}`;

export function PresetModal({ guildId, initial, onClose }: PresetModalProps) {
  const t = useTranslations('GuildGroups');
  const { createPreset, updatePreset } = useGuildPresets(guildId);
  const { roles } = useGuildRoles(guildId);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<GroupType>(initial?.category ?? 'OTHER');
  const [icon, setIcon] = useState(initial?.icon ?? '📅');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [groups, setGroups] = useState<DraftGroup[]>(
    initial?.groups.map((g) => ({ ...g })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const roleQuantities = useMemo(() => {
    const map = new Map<string, number>();
    groups.forEach((g) =>
      g.roles.forEach((r) =>
        map.set(r.roleId, (map.get(r.roleId) ?? 0) + r.quantity),
      ),
    );
    return map;
  }, [groups]);

  const updateGroup = (id: string, patch: Partial<DraftGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { id: nextId(), name: '', maxPlayers: 5, roles: [] },
    ]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const addRoleToGroup = (gid: string) => {
    const available = roles.find(
      (r) => !groups.find((g) => g.id === gid)?.roles.some((rq) => rq.roleId === r.id),
    );
    if (!available) return;
    updateGroup(gid, {
      roles: [...groups.find((g) => g.id === gid)!.roles, { roleId: available.id, quantity: 1 }],
    });
  };

  const updateRoleInGroup = (
    gid: string,
    idx: number,
    patch: Partial<{ roleId: string; quantity: number }>,
  ) => {
    updateGroup(gid, {
      roles: groups
        .find((g) => g.id === gid)!
        .roles.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const removeRoleFromGroup = (gid: string, idx: number) => {
    updateGroup(gid, {
      roles: groups.find((g) => g.id === gid)!.roles.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('presetNameRequired'));
      return;
    }
    const validGroups = groups.filter((g) => g.name.trim());
    if (validGroups.length === 0) {
      setError(t('presetGroupsRequired'));
      return;
    }
    const hasInvalidSize = validGroups.some(
      (g) => !Number.isFinite(g.maxPlayers) || g.maxPlayers < 1,
    );
    if (hasInvalidSize) {
      setError(t('groupSizeInvalid'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        guildId,
        name: trimmed,
        description: description.trim(),
        category,
        icon,
        color,
        groups: validGroups.map((g): PresetGroup => ({
          id: g.id,
          name: g.name.trim(),
          maxPlayers: Math.min(50, Math.max(1, g.maxPlayers)),
          roles: g.roles
            .filter((r) => r.roleId && r.quantity > 0)
            .map((r) => ({ roleId: r.roleId, quantity: r.quantity })),
        })),
        createdBy: initial?.createdBy ?? 'user',
      };
      if (initial) {
        await updatePreset(initial.id, payload);
      } else {
        await createPreset(payload);
      }
      onClose();
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
        className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            {initial ? t('editPreset') : t('newPreset')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('presetNamePlaceholder')}
                maxLength={40}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">{t('type')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GroupType)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors"
              >
                {Object.values(GROUP_TYPES).map((k) => (
                  <option key={k} value={k}>
                    {t(`type_${k}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">{t('description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('presetDescriptionPlaceholder')}
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">{t('icon')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all',
                    icon === ic
                      ? 'border-accent bg-accent/20'
                      : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d] hover:border-accent/40',
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">{t('headerColor')}</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-transform',
                    color === c ? 'scale-110 ring-2 ring-white/70' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-[rgba(38,51,86,0.5)]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-muted">{t('groupsBuilder')}</label>
              <button
                type="button"
                onClick={addGroup}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-accent/20 border border-accent/40 text-white flex items-center gap-1.5 hover:bg-accent/30 transition-colors"
              >
                <Plus size={12} />
                {t('addGroup')}
              </button>
            </div>

            <div className="space-y-3">
              {groups.length === 0 && (
                <p className="text-xs text-muted py-3 text-center border border-dashed border-[rgba(38,51,86,0.4)] rounded-lg">
                  {t('noGroupsInPreset')}
                </p>
              )}

              {groups.map((g, gi) => (
                <div
                  key={g.id}
                  className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                      placeholder={t('groupNamePlaceholder')}
                      maxLength={40}
                      className="flex-1 h-9 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={String(g.maxPlayers)}
                      onChange={(e) =>
                        updateGroup(g.id, { maxPlayers: Number(e.target.value) })
                      }
                      className="w-16 h-9 px-2 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors"
                      title={t('size')}
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(g.id)}
                      className="p-1.5 rounded text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {g.roles.map((rq, ri) => {
                      const role = roles.find((r) => r.id === rq.roleId);
                      return (
                        <div key={ri} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: role?.color ?? '#6d28d9' }}
                          />
                          <select
                            value={rq.roleId}
                            onChange={(e) =>
                              updateRoleInGroup(g.id, ri, { roleId: e.target.value })
                            }
                            className="flex-1 h-8 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white focus:outline-none transition-colors"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-muted">{t('quantity')}:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateRoleInGroup(g.id, ri, {
                                  quantity: Math.max(1, rq.quantity - 1),
                                })
                              }
                              className="w-7 h-7 rounded bg-[#070f1d] border border-[rgba(38,51,86,0.5)] text-muted hover:text-white text-sm transition-colors"
                            >
                              −
                            </button>
                            <span className="w-7 text-center text-sm text-white">
                              {rq.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateRoleInGroup(g.id, ri, {
                                  quantity: Math.min(50, rq.quantity + 1),
                                })
                              }
                              className="w-7 h-7 rounded bg-[#070f1d] border border-[rgba(38,51,86,0.5)] text-muted hover:text-white text-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoleFromGroup(g.id, ri)}
                            className="p-1 rounded text-muted hover:text-red-400 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}

                    {g.roles.length < roles.length && (
                      <button
                        type="button"
                        onClick={() => addRoleToGroup(g.id)}
                        className="text-[11px] text-accent hover:underline flex items-center gap-1"
                      >
                        <Plus size={11} />
                        {t('addRoleToGroup')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {roleQuantities.size > 0 && (
            <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-3">
              <p className="text-xs text-muted mb-1.5">{t('summary')}</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from(roleQuantities.entries()).map(([roleId, qty]) => {
                  const role = roles.find((r) => r.id === roleId);
                  return (
                    <span
                      key={roleId}
                      className="px-2 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-[11px]"
                      style={{ color: role?.color }}
                    >
                      {role?.name ?? '?'} × {qty}
                    </span>
                  );
                })}
                <span className="px-2 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.5)] text-[11px] text-muted">
                  {groups.reduce((acc, g) => acc + (g.maxPlayers || 0), 0)}{' '}
                  {t('totalPlayersLabel')}
                </span>
              </div>
            </div>
          )}

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