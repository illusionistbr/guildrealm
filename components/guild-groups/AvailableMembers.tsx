'use client';

import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { type ReactElement } from 'react';
import { Search, UserMinus } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

interface AvailableMembersProps {
  memberIds: string[];
  memberNames: Record<string, string>;
  search: string;
  onSearchChange: (v: string) => void;
  renderMember: (userId: string, roleId: string | null) => ReactElement;
}

export function AvailableMembers({
  memberIds,
  memberNames,
  search,
  onSearchChange,
  renderMember,
}: AvailableMembersProps) {
  const t = useTranslations('GuildGroups');
  const { setNodeRef, isOver } = useDroppable({ id: 'available-members' });

  const filtered = memberIds.filter((uid) => {
    const name = (memberNames[uid] ?? '').toLowerCase();
    return name.includes(search.trim().toLowerCase());
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122]/80 transition-colors',
        isOver && 'border-accent/70',
      )}
    >
      <div className="px-3 py-2.5 border-b border-[rgba(38,51,86,0.5)]">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          {t('availableMembers')}
          <span className="text-[10px] font-normal text-muted">{memberIds.length}</span>
        </p>
      </div>
      <div className="p-3">
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchAvailable')}
            className="w-full h-9 pl-9 pr-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-muted">
            <UserMinus size={20} className="opacity-50" />
            <p className="text-xs text-center">{t('noAvailableMembers')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">{filtered.map((uid) => renderMember(uid, null))}</div>
        )}
      </div>
    </div>
  );
}