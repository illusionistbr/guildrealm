'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { GuildRole } from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';

interface MemberChipProps {
  id: string;
  userId: string;
  name: string;
  roleId: string | null;
  roles: GuildRole[];
  isLeader: boolean;
  draggable?: boolean;
  droppable?: boolean;
  onRoleChange: (roleId: string | null) => void;
  onRemove?: () => void;
  accentColor?: string;
}

export function MemberChip({
  id,
  userId,
  name,
  roleId,
  roles,
  isLeader,
  draggable = true,
  droppable = false,
  onRoleChange,
  onRemove,
  accentColor,
}: MemberChipProps) {
  const t = useTranslations('GuildGroups');

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({ id, disabled: !draggable });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: !droppable,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const role = roles.find((r) => r.id === roleId);

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        'group/chip flex items-center gap-1.5 rounded-lg border px-1.5 py-1',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isOver
          ? 'border-accent/80 bg-accent/10 shadow-[0_0_12px_rgba(109,40,217,0.35)]'
          : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d]',
      )}
      title={draggable ? t('dragHint') : undefined}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        style={{ backgroundColor: role?.color ?? accentColor ?? '#6d28d9' }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="text-xs text-white truncate flex-1 min-w-0">{name}</span>

      {isLeader && (
        <>
          <select
            value={roleId ?? ''}
            onChange={(e) => onRoleChange(e.target.value || null)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-16 shrink-0 rounded border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-[10px] px-1 py-0.5 cursor-pointer focus:outline-none',
              role ? 'text-white' : 'text-muted',
            )}
            style={role ? { color: role.color, borderColor: `${role.color}55` } : undefined}
            title={t('setRole')}
          >
            <option value="" className="text-muted">
              {t('noRole')}
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id} style={{ color: r.color }}>
                {r.name}
              </option>
            ))}
          </select>

          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title={t('removeMember')}
              className="p-0.5 rounded text-muted opacity-0 group-hover/chip:opacity-100 hover:text-red-400 transition-opacity"
            >
              <X size={11} />
            </button>
          )}
        </>
      )}
    </div>
  );
}