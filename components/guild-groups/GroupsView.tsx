'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Shield, Sparkles, Users as UsersIcon } from 'lucide-react';
import {
  GroupWithMembers,
  useGuildGroups,
  useGuildPresets,
  useGuildRoles,
} from '@/lib/groups/hooks';
import { GuildRole } from '@/lib/groups/types';
import { GuildPreset } from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';
import { GroupCard } from './GroupCard';
import { MemberChip } from './MemberChip';
import { AvailableMembers } from './AvailableMembers';
import { GroupModal } from './GroupModal';
import { PresetGallery } from './PresetGallery';
import { PresetModal } from './PresetModal';
import { RolesManager } from './RolesManager';
import { ConfirmDialog } from './ConfirmDialog';

interface GroupsViewProps {
  guildId: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberRoles?: Record<string, string>;
  isLeader: boolean;
}

type Tab = 'groups' | 'presets';

export function GroupsView({
  guildId,
  memberIds,
  memberNames,
  memberRoles = {},
  isLeader,
}: GroupsViewProps) {
  const t = useTranslations('GuildGroups');
  const [tab, setTab] = useState<Tab>('groups');
  const [availableSearch, setAvailableSearch] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithMembers | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<GuildPreset | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<GroupWithMembers | null>(null);
  const [deletePresetTarget, setDeletePresetTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [draggingChip, setDraggingChip] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [draggingGroup, setDraggingGroup] = useState<GroupWithMembers | null>(null);

  const {
    groups,
    loading,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    addMemberToGroup,
    moveMember,
    removeMemberFromGroup,
    setMemberRole,
    createGroupsFromPreset,
  } = useGuildGroups(guildId);

  const { roles } = useGuildRoles(guildId);
  const { presets, deletePreset } = useGuildPresets(guildId);

  const roleIdFor = useCallback(
    (userId: string): string | null => {
      const roleName = memberRoles[userId];
      if (!roleName) return null;
      return roles.find((r) => r.name === roleName)?.id ?? null;
    },
    [memberRoles, roles],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setErrorMsg(''), 4000);
  }, []);

  const assignedIds = useMemo(
    () => new Set(groups.flatMap((g) => g.members.map((m) => m.userId))),
    [groups],
  );

  const availableIds = useMemo(
    () => memberIds.filter((id) => !assignedIds.has(id)),
    [memberIds, assignedIds],
  );

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const id = String(e.active.id);
      if (id.startsWith('member-')) {
        const gid = id.split('-')[1];
        const uid = id.split('-').slice(2).join('-');
        const group = groups.find((g) => g.id === gid);
        const color = group?.headerColor ?? '#6d28d9';
        setDraggingChip({ id, name: memberNames[uid] ?? uid, color });
      } else if (id.startsWith('available-')) {
        const uid = id.slice('available-'.length);
        setDraggingChip({ id, name: memberNames[uid] ?? uid, color: '#22c55e' });
      } else if (id.startsWith('group-')) {
        const gid = id.slice('group-'.length);
        const group = groups.find((g) => g.id === gid) ?? null;
        setDraggingGroup(group);
      }
    },
    [groups, memberNames],
  );

  const handleDragOver = useCallback(
    (_e: DragOverEvent) => {
      // sem lógica extra: drops resolvidos no dragEnd
    },
    [],
  );

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const activeId = String(e.active.id);
      const overId = e.over ? String(e.over.id) : '';
      setDraggingChip(null);
      setDraggingGroup(null);

      if (!overId) return;

      if (!isLeader) {
        setDraggingChip(null);
        setDraggingGroup(null);
        return;
      }

      const parseMemberId = (id: string) => {
        const parts = id.split('-');
        return { gid: parts[1], uid: parts.slice(2).join('-') };
      };
      const overGroupId = (id: string) => {
        if (id.startsWith('group-')) return id.slice('group-'.length);
        if (id.startsWith('member-')) return parseMemberId(id).gid;
        return null;
      };

      try {
        if (activeId.startsWith('available-')) {
          const uid = activeId.slice('available-'.length);
          const gid = overGroupId(overId);
          if (gid) await addMemberToGroup(gid, uid, roleIdFor(uid));
        } else if (activeId.startsWith('member-')) {
          const { gid: fromGid, uid } = parseMemberId(activeId);
          if (overId === 'available-members') {
            await removeMemberFromGroup(fromGid, uid);
            return;
          }
          const toGid = overGroupId(overId);
          if (toGid && toGid !== fromGid) {
            await moveMember(uid, fromGid, toGid, roleIdFor(uid));
          }
        } else if (activeId.startsWith('group-')) {
          const fromGid = activeId.slice('group-'.length);
          const toGid = overGroupId(overId);
          if (toGid && toGid !== fromGid) {
            const ids = groups.map((g) => g.id);
            const next = arrayMove(
              ids,
              ids.indexOf(fromGid),
              ids.indexOf(toGid),
            );
            await reorderGroups(next);
          }
        }
      } catch (err) {
        const raw = (err as { code?: string; message?: string }) ?? {};
        const code = raw.code ?? '';
        const msg = raw.message ?? '';
        const groupFull =
          code.includes('group-full') ||
          code === 'GROUP_FULL' ||
          msg.toLowerCase().includes('full') ||
          msg.toLowerCase().includes('capacidade');
        const already =
          code.includes('already-in-group') ||
          code === 'ALREADY_IN_GROUP' ||
          msg.toLowerCase().includes('another group') ||
          msg.toLowerCase().includes('outro grupo');
        showError(
          groupFull
            ? t('errorGroupFull')
            : already
              ? t('errorAlreadyInGroup')
              : t('errorGeneric'),
        );
      }
    },
    [groups, addMemberToGroup, moveMember, removeMemberFromGroup, reorderGroups, roleIdFor, showError, t],
  );

  const groupOrderIds = useMemo(() => groups.map((g) => g.id), [groups]);

  const renderGroupMember = (group: GroupWithMembers) => (userId: string, roleId: string | null) => (
    <MemberChip
      key={`member-${group.id}-${userId}`}
      id={`member-${group.id}-${userId}`}
      userId={userId}
      name={memberNames[userId] ?? userId}
      roleId={roleId}
      roles={roles}
      isLeader={isLeader}
      draggable={isLeader}
      droppable={isLeader}
      accentColor={group.headerColor}
      onRoleChange={(r) => void setMemberRole(group.id, userId, r)}
      onRemove={() => void removeMemberFromGroup(group.id, userId)}
    />
  );

  const renderAvailableMember = (userId: string) => (
    <MemberChip
      key={`available-${userId}`}
      id={`available-${userId}`}
      userId={userId}
      name={memberNames[userId] ?? userId}
      roleId={null}
      roles={[]}
      isLeader={false}
      draggable={isLeader}
      accentColor="#22c55e"
      onRoleChange={() => {}}
    />
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setTab('groups')}
          className={cn(
            'h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
            tab === 'groups'
              ? 'bg-accent/20 text-white border border-accent/40'
              : 'border border-[rgba(38,51,86,0.5)] text-muted hover:text-white',
          )}
        >
          <UsersIcon size={14} />
          {t('tabGroups')}
        </button>
        <button
          onClick={() => setTab('presets')}
          className={cn(
            'h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
            tab === 'presets'
              ? 'bg-accent/20 text-white border border-accent/40'
              : 'border border-[rgba(38,51,86,0.5)] text-muted hover:text-white',
          )}
        >
          <Sparkles size={14} />
          {t('tabPresets')}
        </button>

        <div className="flex-1" />

        {tab === 'groups' && isLeader && (
          <>
            <button
              onClick={() => setRolesOpen(true)}
              className="h-9 px-4 rounded-lg text-sm font-medium border border-[rgba(38,51,86,0.5)] text-muted hover:text-white flex items-center gap-2 transition-colors"
            >
              <Shield size={14} />
              {t('manageRoles')}
            </button>
            <button
              onClick={() => {
                setEditingGroup(null);
                setGroupModalOpen(true);
              }}
              className="h-9 px-4 rounded-lg text-sm font-semibold bg-accent hover:bg-accent/80 text-white flex items-center gap-2 transition-colors"
            >
              <Plus size={14} />
              {t('newGroup')}
            </button>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {tab === 'groups' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="w-full lg:w-72 shrink-0">
              <AvailableMembers
                memberIds={availableIds}
                memberNames={memberNames}
                search={availableSearch}
                onSearchChange={setAvailableSearch}
                renderMember={renderAvailableMember}
              />
              {isLeader && (
                <p className="mt-2 text-[11px] text-muted px-1">{t('dragHintText')}</p>
              )}
            </div>

            <div className="flex-1 w-full min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted">
                  <Loader2 size={22} className="animate-spin mr-2" />
                  {t('loading')}
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.5)] py-16 text-center text-muted">
                  <p className="text-sm">{t('noGroups')}</p>
                  {isLeader && (
                    <button
                      onClick={() => {
                        setEditingGroup(null);
                        setGroupModalOpen(true);
                      }}
                      className="mt-4 inline-flex h-9 px-4 items-center gap-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent/80 text-white transition-colors"
                    >
                      <Plus size={14} />
                      {t('createFirstGroup')}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <SortableContext
                    items={groupOrderIds.map((id) => `group-${id}`)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex gap-3 overflow-x-auto pb-3">
                      {groups.map((g) => (
                        <GroupCard
                          key={g.id}
                          group={g}
                          roles={roles}
                          isLeader={isLeader}
                          isOver={false}
                          onEdit={() => {
                            setEditingGroup(g);
                            setGroupModalOpen(true);
                          }}
                          onDelete={() => setDeleteGroupTarget(g)}
                          renderMember={renderGroupMember(g)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </>
              )}
            </div>
          </div>

          <DragOverlay>
            {draggingChip && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] px-2 py-1 shadow-xl">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: draggingChip.color }}
                >
                  {draggingChip.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs text-white">{draggingChip.name}</span>
              </div>
            )}
            {draggingGroup && (
              <div className="w-[272px] rounded-xl border border-accent/50 bg-[#0a1122] p-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: draggingGroup.headerColor }}
                  />
                  <p className="text-sm font-semibold text-white">
                    {draggingGroup.name}
                  </p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {tab === 'presets' && (
        <PresetGallery
          presets={presets}
          isLeader={isLeader}
          onNew={() => {
            setEditingPreset(null);
            setPresetModalOpen(true);
          }}
          onEdit={(preset) => {
            setEditingPreset(preset);
            setPresetModalOpen(true);
          }}
          onUse={async (preset) => {
            try {
              await createGroupsFromPreset(preset);
            } catch {
              showError(t('errorGeneric'));
            }
          }}
          onDelete={(id) => setDeletePresetTarget(id)}
        />
      )}

      {groupModalOpen && (
        <GroupModal
          initial={editingGroup ? {
            id: editingGroup.id,
            name: editingGroup.name,
            type: editingGroup.type,
            headerColor: editingGroup.headerColor,
            maxPlayers: editingGroup.maxPlayers,
          } : null}
          onClose={() => setGroupModalOpen(false)}
          onSubmit={async (data) => {
            try {
              if (editingGroup) {
                await updateGroup(editingGroup.id, data);
              } else {
                await createGroup(data);
              }
              setGroupModalOpen(false);
            } catch {
              showError(t('errorGeneric'));
            }
          }}
        />
      )}

      {presetModalOpen && (
        <PresetModal
          guildId={guildId}
          initial={editingPreset}
          onClose={() => setPresetModalOpen(false)}
        />
      )}

      {rolesOpen && (
        <RolesManager guildId={guildId} onClose={() => setRolesOpen(false)} />
      )}

      {deleteGroupTarget && (
        <ConfirmDialog
          title={t('deleteGroupTitle')}
          message={`${t('deleteGroupMessage')}\n\n${deleteGroupTarget.name}`}
          danger
          confirmLabel={t('delete')}
          onConfirm={async () => {
            await deleteGroup(deleteGroupTarget.id);
          }}
          onClose={() => setDeleteGroupTarget(null)}
        />
      )}

      {deletePresetTarget && (
        <ConfirmDialog
          title={t('deletePresetTitle')}
          message={t('deletePresetMessage')}
          danger
          confirmLabel={t('delete')}
          onConfirm={async () => {
            await deletePreset(deletePresetTarget);
          }}
          onClose={() => setDeletePresetTarget(null)}
        />
      )}
    </div>
  );
}