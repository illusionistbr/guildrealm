'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import { GuildRole, ROLE_COLORS } from '@/lib/groups/types';
import { useGuildRoles } from '@/lib/groups/hooks';
import { cn } from '@/lib/admin/utils/cn';
import { ROLE_ICON_MAP, RoleIcon } from './RoleIcon';

interface RolesManagerProps {
  guildId: string;
  onClose: () => void;
}

export function RolesManager({ guildId, onClose }: RolesManagerProps) {
  const t = useTranslations('GuildGroups');
  const { roles, loading, createRole, updateRole, deleteRole } = useGuildRoles(guildId);

  const [editing, setEditing] = useState<GuildRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customRoles = useMemo(() => roles.filter((r) => !r.isDefault), [roles]);

  const iconOptions = useMemo(() => Object.keys(ROLE_ICON_MAP), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = (e.currentTarget as HTMLFormElement).roleName.value.trim() as string;
    const icon = (e.currentTarget as HTMLFormElement).roleIcon.value as string;
    const color = (e.currentTarget as HTMLFormElement).roleColor.value as string;
    if (!name) {
      setError(t('roleNameRequired'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateRole(editing.id, { name, icon, color });
      } else {
        await createRole({ name, icon, color });
      }
      setEditing(null);
      (e.currentTarget as HTMLFormElement).reset();
    } catch {
      setError(t('saveError'));
    } finally {
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
            <Shield size={18} className="text-accent" />
            {t('manageRoles')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] px-3 py-2"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${r.color}22`, border: `1px solid ${r.color}44` }}
                  >
                    <RoleIcon icon={r.icon} color={r.color} size={13} />
                  </span>
                  <span className="text-sm text-white flex-1 truncate">{r.name}</span>
                  {r.isDefault ? (
                    <span className="text-[10px] text-muted px-1.5 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.4)]">
                      {t('defaultRole')}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(r)}
                        title={t('editRole')}
                        className="p-1.5 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => void deleteRole(r.id)}
                        title={t('deleteRole')}
                        className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-[rgba(38,51,86,0.3)] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Plus size={14} className="text-accent" />
                {editing ? t('editRole') : t('newRole')}
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-muted mb-1">{t('name')}</label>
                  <input
                    name="roleName"
                    defaultValue={editing?.name ?? ''}
                    key={`name-${editing?.id ?? 'new'}`}
                    placeholder={t('roleNamePlaceholder')}
                    maxLength={30}
                    className="w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{t('roleIcon')}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {iconOptions.map((ic) => {
                      const Icon = ROLE_ICON_MAP[ic];
                      const active = (editing?.icon ?? 'Shield') === ic;
                      return (
                        <button
                          key={ic}
                          type="button"
                          onClick={(e) => {
                            (e.currentTarget.closest('form') as HTMLFormElement).roleIcon.value = ic;
                            (e.currentTarget.closest('form') as HTMLFormElement)
                              .querySelectorAll('input[name="roleIcon"]')
                              .forEach((el) => ((el as HTMLInputElement).value = ic));
                            setEditing((prev) =>
                              prev ? { ...prev, icon: ic } : prev,
                            );
                          }}
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
                            active
                              ? 'border-accent bg-accent/20 text-white'
                              : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                          )}
                        >
                          <Icon size={14} style={{ color: editing?.color ?? '#8b5cf6' }} />
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name="roleIcon" value={editing?.icon ?? 'Shield'} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{t('roleColor')}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ROLE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditing((prev) => (prev ? { ...prev, color: c.value } : prev))}
                        className={cn(
                          'w-7 h-7 rounded-lg transition-transform',
                          (editing?.color ?? '#8b5cf6') === c.value
                            ? 'scale-110 ring-2 ring-white/70'
                            : 'hover:scale-105',
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <input type="hidden" name="roleColor" value={editing?.color ?? '#8b5cf6'} />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-9 rounded-lg bg-accent hover:bg-accent/80 text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    {editing ? t('save') : t('create')}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="h-9 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}