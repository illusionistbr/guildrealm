'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Sparkles, Trash2, Users as UsersIcon } from 'lucide-react';
import { GuildPreset, GROUP_TYPES, GroupType } from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';

interface PresetGalleryProps {
  presets: GuildPreset[];
  isLeader: boolean;
  onNew: () => void;
  onUse: (preset: GuildPreset) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit?: (preset: GuildPreset) => void;
}

export function PresetGallery({
  presets,
  isLeader,
  onNew,
  onUse,
  onDelete,
  onEdit,
}: PresetGalleryProps) {
  const t = useTranslations('GuildGroups');
  const [filter, setFilter] = useState<GroupType | 'ALL'>('ALL');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const categories = useMemo(
    () => Object.values(GROUP_TYPES),
    [],
  );

  const filtered = useMemo(
    () => (filter === 'ALL' ? presets : presets.filter((p) => p.category === filter)),
    [presets, filter],
  );

  const handleUse = async (preset: GuildPreset) => {
    setApplyingId(preset.id);
    try {
      await onUse(preset);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter('ALL')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
            filter === 'ALL'
              ? 'border-accent/40 bg-accent/20 text-white'
              : 'border-[rgba(38,51,86,0.5)] text-muted hover:text-white',
          )}
        >
          {t('filterAll')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
              filter === cat
                ? 'border-accent/40 bg-accent/20 text-white'
                : 'border-[rgba(38,51,86,0.5)] text-muted hover:text-white',
            )}
          >
            {t(`type_${cat}`)}
          </button>
        ))}
        <div className="flex-1" />
        {isLeader && (
          <button
            onClick={onNew}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-accent hover:bg-accent/80 text-white flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            {t('newPreset')}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.5)] py-16 text-center text-muted">
          <p className="text-sm">{t('noPresets')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((preset) => {
            const totalPlayers = preset.groups.reduce(
              (acc, g) => acc + g.maxPlayers,
              0,
            );
            return (
              <div
                key={preset.id}
                className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122]/80 p-4 flex flex-col gap-3"
                style={{ borderTopColor: preset.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${preset.color}22` }}
                    >
                      {preset.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-muted">
                        {t(`type_${preset.category}`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isLeader && onEdit && (
                      <button
                        onClick={() => onEdit(preset)}
                        title={t('editPreset')}
                        className="p-1.5 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {isLeader && (
                      <button
                        onClick={() => onDelete(preset.id)}
                        title={t('deletePreset')}
                        className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-[rgba(38,51,86,0.3)] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {preset.description && (
                  <p className="text-xs text-muted line-clamp-2">
                    {preset.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} />
                    {preset.groups.length} {t('groupsCount')}
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon size={12} />
                    {totalPlayers}
                  </span>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {preset.groups.slice(0, 6).map((g) => (
                    <span
                      key={g.id}
                      className="px-1.5 py-0.5 rounded bg-[#070f1d] border border-[rgba(38,51,86,0.5)] text-[10px] text-muted"
                    >
                      {g.name} ({g.maxPlayers})
                    </span>
                  ))}
                  {preset.groups.length > 6 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-muted">
                      +{preset.groups.length - 6}
                    </span>
                  )}
                </div>

                {isLeader && (
                  <button
                    onClick={() => void handleUse(preset)}
                    disabled={applyingId === preset.id}
                    className="mt-auto h-9 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: preset.color }}
                  >
                    {applyingId === preset.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    {t('usePreset')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}