'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { useMemo, type ReactElement } from 'react';
import { GripVertical, Pencil, Trash2, Users as UsersIcon, UserPlus } from 'lucide-react';
import { GroupWithMembers } from '@/lib/groups/hooks';
import { GuildRole } from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';
import { RoleIcon } from './RoleIcon';
import { GROUP_TYPE_ICONS } from './RoleIcon';

interface GroupCardProps {
  group: GroupWithMembers;
  roles: GuildRole[];
  isLeader: boolean;
  isOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  renderMember: (userId: string, roleId: string | null) => ReactElement;
}

export function GroupCard({
  group,
  roles,
  isLeader,
  isOver,
  onEdit,
  onDelete,
  renderMember,
}: GroupCardProps) {
  const t = useTranslations('GuildGroups');
  const {
    setNodeRef,
    isOver: isOverSortable,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${group.id}`, disabled: !isLeader });

  const TypeIcon = GROUP_TYPE_ICONS[group.type] ?? GROUP_TYPE_ICONS.OTHER;

  const sections = useMemo(() => {
    const byRole = new Map<string | null, GroupWithMembers['members']>();
    for (const m of group.members) {
      const key = m.roleId ?? '__none__';
      if (!byRole.has(key)) byRole.set(key, []);
      byRole.get(key)!.push(m);
    }
    const roleSections = roles
      .filter((r) => byRole.has(r.id))
      .map((r) => ({
        role: r,
        members: byRole
          .get(r.id)!
          .slice()
          .sort((a, b) => a.position - b.position),
      }));
    const noRole =
      (byRole.get('__none__') ?? []).slice().sort((a, b) => a.position - b.position);
    return { roleSections, noRole };
  }, [group.members, roles]);

  const capacityPct = Math.min(
    100,
    Math.round((group.members.length / Math.max(1, group.maxPlayers)) * 100),
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'w-[272px] shrink-0 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122]/80 transition-colors',
        isDragging && 'opacity-60',
        (isOver || isOverSortable) &&
          'border-accent/70 shadow-[0_0_20px_rgba(109,40,217,0.25)]',
      )}
    >
      <div
        className="px-3 py-2.5 rounded-t-xl flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: `${group.headerColor}22`,
          borderBottom: `1px solid ${group.headerColor}55`,
        }}
        title={t('dragGroupHint')}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: group.headerColor }}
          />
          <TypeIcon size={14} className="text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {group.name}
            </p>
            <p className="text-[10px] text-muted leading-tight">
              {t(`type_${group.type}`)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isLeader && (
            <>
              <button
                onClick={onEdit}
                title={t('editGroup')}
                className="p-1 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onDelete}
                title={t('deleteGroup')}
                className="p-1 rounded text-muted hover:text-red-400 hover:bg-[rgba(38,51,86,0.3)] transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <GripVertical size={13} className="text-[rgba(38,51,86,0.8)]" />
        </div>
      </div>

      <div className="px-3 pt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <UsersIcon size={12} />
          {group.members.length}/{group.maxPlayers}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-[#070f1d] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              capacityPct >= 100 ? 'bg-red-500' : 'bg-accent',
            )}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2.5 min-h-[90px]">
        {sections.roleSections.map(({ role, members }) => (
          <div key={role.id}>
            <p
              className="text-[11px] font-medium flex items-center gap-1.5 mb-1.5"
              style={{ color: role.color }}
            >
              <RoleIcon icon={role.icon} color={role.color} size={12} />
              {role.name}
              <span className="text-[10px] text-muted">({members.length})</span>
            </p>
            <div className="space-y-1.5">
              {members.map((m) => renderMember(m.userId, m.roleId))}
            </div>
          </div>
        ))}

        {sections.noRole.length > 0 && (
          <div>
            <p className="text-[11px] text-muted mb-1.5">{t('noRoleLabel')}</p>
            <div className="space-y-1.5">
              {sections.noRole.map((m) => renderMember(m.userId, m.roleId))}
            </div>
          </div>
        )}

        {group.members.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-muted">
            <UserPlus size={20} className="opacity-50" />
            <p className="text-xs">{t('dropHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}