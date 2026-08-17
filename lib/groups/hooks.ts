'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { GuildGroup, GroupMemberEntry, GuildRole, GuildPreset, GuildRank, DEFAULT_ROLES, DEFAULT_RANKS, type RecruitmentSettings, type ApplicationAnswer } from './types';

function tsToDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val && typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return undefined;
}

const groupsCol = (guildId: string) =>
  collection(getFirebaseDb(), 'guilds', guildId, 'groups');
const groupDoc = (guildId: string, groupId: string) =>
  doc(getFirebaseDb(), 'guilds', guildId, 'groups', groupId);
const groupMembersCol = (guildId: string, groupId: string) =>
  collection(getFirebaseDb(), 'guilds', guildId, 'groups', groupId, 'members');
const presetsCol = (guildId: string) =>
  collection(getFirebaseDb(), 'guilds', guildId, 'presets');
const rolesCol = (guildId: string) =>
  collection(getFirebaseDb(), 'guilds', guildId, 'roles');
const ranksCol = (guildId: string) =>
  collection(getFirebaseDb(), 'guilds', guildId, 'ranks');
const recruitmentDoc = (guildId: string) =>
  doc(getFirebaseDb(), 'guilds', guildId, 'settings', 'recruitment');

// ============ ROLES ============
export function useGuildRoles(guildId: string | null) {
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(true);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  useEffect(() => {
    if (!guildId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(rolesCol(guildId)),
      (snap) => {
        const list: GuildRole[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            guildId: data.guildId ?? guildId,
            name: data.name ?? '',
            icon: data.icon ?? 'Shield',
            color: data.color ?? '#8b5cf6',
            isDefault: !!data.isDefault,
            createdBy: data.createdBy ?? '',
            createdAt: tsToDate(data.createdAt),
          });
        });
        setRoles(list);
        setLoading(false);
        if (snap.empty) void seedDefaultRoles(guildId);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  const createRole = useCallback(
    async (data: { name: string; icon: string; color: string }) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const ref = await addDoc(rolesCol(gid), {
        ...data,
        guildId: gid,
        isDefault: false,
        createdBy: 'user',
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    [],
  );

  const updateRole = useCallback(
    async (roleId: string, data: Partial<GuildRole>) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await updateDoc(doc(rolesCol(gid), roleId), data);
    },
    [],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await deleteDoc(doc(rolesCol(gid), roleId));
    },
    [],
  );

  return { roles, loading, createRole, updateRole, deleteRole };
}

async function seedDefaultRoles(guildId: string) {
  try {
    const batch = writeBatch(getFirebaseDb());
    for (const r of DEFAULT_ROLES) {
      batch.set(doc(rolesCol(guildId)), {
        ...r,
        guildId,
        createdBy: 'system',
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch {
    // permissão negada ou concorrência: ignora
  }
}

// ============ RANKS (CARGOS) ============
export function useGuildRanks(guildId: string | null) {
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [loading, setLoading] = useState(true);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  useEffect(() => {
    if (!guildId) {
      setRanks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(ranksCol(guildId), orderBy('position', 'asc')),
      (snap) => {
        const list: GuildRank[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            guildId: data.guildId ?? guildId,
            name: data.name ?? '',
            color: data.color ?? '#64748b',
            position: data.position ?? 0,
            isDefault: !!data.isDefault,
            permissions: data.permissions ?? {},
            createdBy: data.createdBy ?? '',
            createdAt: tsToDate(data.createdAt),
          });
        });
        setRanks(list);
        setLoading(false);
        if (snap.empty) void seedDefaultRanks(guildId);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  const createRank = useCallback(
    async (data: {
      name: string;
      color: string;
      permissions: GuildRank['permissions'];
    }) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const ref = await addDoc(ranksCol(gid), {
        ...data,
        guildId: gid,
        position: 999,
        isDefault: false,
        createdBy: 'user',
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    [],
  );

  const updateRank = useCallback(
    async (
      rankId: string,
      data: Partial<Omit<GuildRank, 'id' | 'guildId' | 'createdAt'>>,
    ) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await updateDoc(doc(ranksCol(gid), rankId), data);
    },
    [],
  );

  const deleteRank = useCallback(
    async (rankId: string) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await deleteDoc(doc(ranksCol(gid), rankId));
    },
    [],
  );

  return { ranks, loading, createRank, updateRank, deleteRank };
}

// ============ RECRUTAMENTO ============
export function useRecruitmentSettings(guildId: string | null) {
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  useEffect(() => {
    if (!guildId) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      recruitmentDoc(guildId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            enabled: data.enabled === true,
            message: data.message ?? '',
            questions: Array.isArray(data.questions) ? data.questions : [],
            passwordEnabled: data.passwordEnabled === true,
            passwordSet: data.passwordSet === true,
            updatedBy: data.updatedBy,
            updatedAt: tsToDate(data.updatedAt),
          });
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  const save = useCallback(
    async (data: {
      enabled: boolean;
      message: string;
      questions: RecruitmentSettings['questions'];
      passwordEnabled: boolean;
      password: string;
    }) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const fn = httpsCallable<
        {
          guildId: string;
          enabled: boolean;
          message: string;
          questions: RecruitmentSettings['questions'];
          passwordEnabled: boolean;
          password: string;
        },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'saveRecruitmentSettings');
      const res = await fn({
        guildId: gid,
        enabled: data.enabled,
        message: data.message,
        questions: data.questions,
        passwordEnabled: data.passwordEnabled,
        password: data.password,
      });
      return res.data.success;
    },
    [],
  );

  return { settings, loading, save };
}

export async function submitGuildApplication(
  guildId: string,
  characterId: string,
  answers: ApplicationAnswer[],
): Promise<string> {
  const fn = httpsCallable<
    { guildId: string; characterId: string; answers: ApplicationAnswer[] },
    { success: boolean; applicationId?: string }
  >(getFunctions(getFirebaseApp()), 'submitGuildApplication');
  const res = await fn({ guildId, characterId, answers });
  return res.data.applicationId ?? '';
}

async function seedDefaultRanks(guildId: string) {
  try {
    const batch = writeBatch(getFirebaseDb());
    for (const r of DEFAULT_RANKS) {
      batch.set(doc(ranksCol(guildId)), {
        ...r,
        guildId,
        createdBy: 'system',
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch {
    // permissão negada ou concorrência: ignora
  }
}

export interface GroupWithMembers extends GuildGroup {
  members: GroupMemberEntry[];
}

// ============ GROUPS ============
export function useGuildGroups(guildId: string | null) {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;
  const groupsRef = useRef<GroupWithMembers[]>([]);
  groupsRef.current = groups;

  // Aplica a mudança otimista e reverte caso a operação no servidor falhe.
  const withOptimistic = useCallback(
    async (mutate: (prev: GroupWithMembers[]) => GroupWithMembers[], fn: () => Promise<unknown>) => {
      const prev = groupsRef.current;
      setGroups(mutate(prev));
      try {
        await fn();
      } catch (err) {
        setGroups(prev);
        throw err;
      }
    },
    [],
  );

  useEffect(() => {
    if (!guildId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const listRef = query(groupsCol(guildId), orderBy('position', 'asc'));
    const membersMap: Record<string, GroupMemberEntry[]> = {};
    const memberListeners: (() => void)[] = [];
    const observedGroups = new Set<string>();

    const attachMembers = (groupId: string) => {
      memberListeners.push(
        onSnapshot(
          query(groupMembersCol(guildId, groupId), orderBy('position', 'asc')),
          (msnap) => {
            const list: GroupMemberEntry[] = [];
            msnap.forEach((m) => {
              const md = m.data();
              list.push({
                userId: m.id,
                roleId: md.roleId ?? null,
                position: md.position ?? 0,
                joinedAt: tsToDate(md.joinedAt),
              });
            });
            membersMap[groupId] = list;
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, members: list } : g)),
            );
          },
          () => {},
        ),
      );
    };

    const unsub = onSnapshot(listRef, (snap) => {
      snap.docs.forEach((d) => {
        if (!observedGroups.has(d.id)) {
          observedGroups.add(d.id);
          attachMembers(d.id);
        }
      });
      const next: GroupWithMembers[] = snap.docs.map((d) => {
        const data = d.data() as Partial<GuildGroup>;
        return {
          id: d.id,
          guildId: data.guildId ?? guildId,
          name: data.name ?? '',
          type: data.type ?? 'OTHER',
          headerColor: data.headerColor ?? '#7c3aed',
          maxPlayers: data.maxPlayers ?? 5,
          presetId: data.presetId,
          position: data.position ?? 0,
          createdBy: data.createdBy ?? '',
          createdAt: tsToDate(data.createdAt),
          updatedAt: tsToDate(data.updatedAt),
          members: membersMap[d.id] ?? [],
        };
      });
      setGroups(next);
      setLoading(false);
    });

    return () => {
      unsub();
      memberListeners.forEach((l) => l());
    };
  }, [guildId]);

  const createGroup = useCallback(
    async (data: {
      name: string;
      type: string;
      headerColor: string;
      maxPlayers: number;
      presetId?: string;
    }) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const existing = await getDocs(query(groupsCol(gid)));
      const ref = await addDoc(groupsCol(gid), {
        ...data,
        guildId: gid,
        position: existing.size,
        memberCount: 0,
        createdBy: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    [],
  );

  const updateGroup = useCallback(
    async (
      groupId: string,
      data: Partial<Omit<GuildGroup, 'id' | 'type'>> & { type?: string },
    ) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await updateDoc(groupDoc(gid, groupId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [],
  );

  const deleteGroup = useCallback(async (groupId: string) => {
    const gid = guildIdRef.current;
    if (!gid) return;
    const db = getFirebaseDb();
    const mnap = await getDocs(query(groupMembersCol(gid, groupId)));
    const batch = writeBatch(db);
    mnap.forEach((m) => batch.delete(m.ref));
    batch.delete(groupDoc(gid, groupId));
    await batch.commit();
  }, []);

  const reorderGroups = useCallback(async (orderedIds: string[]) => {
    const gid = guildIdRef.current;
    if (!gid) return;
    const batch = writeBatch(getFirebaseDb());
    orderedIds.forEach((id, idx) => {
      batch.update(groupDoc(gid, id), { position: idx });
    });
    await batch.commit();
  }, []);

  const addMemberToGroup = useCallback(
    async (groupId: string, userId: string, roleId: string | null) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const fn = httpsCallable<{
        guildId: string;
        userId: string;
        toGroupId: string;
        roleId: string | null;
      }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'assignGuildMember',
      );
      await withOptimistic(
        (prev) =>
          prev.map((g) =>
            g.id === groupId && !g.members.some((m) => m.userId === userId)
              ? {
                  ...g,
                  members: [
                    ...g.members,
                    {
                      userId,
                      roleId,
                      position: g.members.length,
                      joinedAt: undefined,
                    },
                  ],
                }
              : g,
          ),
        () => fn({ guildId: gid, userId, toGroupId: groupId, roleId }),
      );
      return true;
    },
    [withOptimistic],
  );

  const moveMember = useCallback(
    async (
      userId: string,
      fromGroupId: string | null,
      toGroupId: string,
      toRoleId: string | null,
    ) => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const fn = httpsCallable<{
        guildId: string;
        userId: string;
        fromGroupId: string | null;
        toGroupId: string;
        roleId: string | null;
      }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'assignGuildMember',
      );
      await withOptimistic(
        (prev) =>
          prev.map((g) => {
            if (g.id === fromGroupId) {
              return { ...g, members: g.members.filter((m) => m.userId !== userId) };
            }
            if (g.id === toGroupId && !g.members.some((m) => m.userId === userId)) {
              return {
                ...g,
                members: [
                  ...g.members,
                  { userId, roleId: toRoleId, position: g.members.length, joinedAt: undefined },
                ],
              };
            }
            return g;
          }),
        () => fn({ guildId: gid, userId, fromGroupId, toGroupId, roleId: toRoleId }),
      );
      return true;
    },
    [withOptimistic],
  );

  const removeMemberFromGroup = useCallback(
    async (groupId: string, userId: string) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      const fn = httpsCallable<{
        guildId: string;
        groupId: string;
        userId: string;
      }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'removeGuildMember',
      );
      await withOptimistic(
        (prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m.userId !== userId) }
              : g,
          ),
        () => fn({ guildId: gid, groupId, userId }),
      );
    },
    [withOptimistic],
  );

  const setMemberRole = useCallback(async (groupId: string, userId: string, roleId: string | null) => {
    const gid = guildIdRef.current;
    if (!gid) return;
    await updateDoc(doc(groupMembersCol(gid, groupId), userId), { roleId });
  }, []);

  const reorderMember = useCallback(
    async (groupId: string, orderedUserIds: string[]) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      const batch = writeBatch(getFirebaseDb());
      orderedUserIds.forEach((uid, idx) => {
        batch.update(doc(groupMembersCol(gid, groupId), uid), { position: idx });
      });
      await batch.commit();
    },
    [],
  );

  const createGroupsFromPreset = useCallback(
    async (preset: GuildPreset, namePrefix?: string): Promise<string[]> => {
      const gid = guildIdRef.current;
      if (!gid) throw new Error('no-guild');
      const existing = await getDocs(query(groupsCol(gid)));
      const base = existing.size;
      const batch = writeBatch(getFirebaseDb());
      const createdIds: string[] = [];
      const prefix = namePrefix?.trim() ? `${namePrefix.trim()} ` : '';
      preset.groups.forEach((pg, i) => {
        const ref = doc(groupsCol(gid));
        batch.set(ref, {
          guildId: gid,
          name: `${prefix}${pg.name || preset.name}`,
          type: preset.category,
          headerColor: preset.color,
          maxPlayers: pg.maxPlayers,
          presetId: preset.id,
          position: base + i,
          memberCount: 0,
          createdBy: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        createdIds.push(ref.id);
      });
      await batch.commit();
      return createdIds;
    },
    [],
  );

  return {
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
    reorderMember,
    createGroupsFromPreset,
  };
}

// ============ PRESETS ============
export function useGuildPresets(guildId: string | null) {
  const [presets, setPresets] = useState<GuildPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  useEffect(() => {
    if (!guildId) {
      setPresets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(presetsCol(guildId)),
      (snap) => {
        const list: GuildPreset[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            guildId: data.guildId ?? guildId,
            name: data.name ?? '',
            description: data.description ?? '',
            category: data.category ?? 'OTHER',
            icon: data.icon ?? '\uD83D\uDCC5',
            color: data.color ?? '#7c3aed',
            groups: Array.isArray(data.groups) ? data.groups : [],
            createdBy: data.createdBy ?? '',
            createdAt: tsToDate(data.createdAt),
            updatedAt: tsToDate(data.updatedAt),
          });
        });
        setPresets(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  const createPreset = useCallback(
    async (data: Omit<GuildPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ref = await addDoc(presetsCol(data.guildId), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    [],
  );

  const updatePreset = useCallback(
    async (presetId: string, data: Partial<GuildPreset>) => {
      const gid = guildIdRef.current;
      if (!gid) return;
      await updateDoc(doc(presetsCol(gid), presetId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [],
  );

  const deletePreset = useCallback(async (presetId: string) => {
    const gid = guildIdRef.current;
    if (!gid) return;
    await deleteDoc(doc(presetsCol(gid), presetId));
  }, []);

  return { presets, loading, createPreset, updatePreset, deletePreset };
}

export function useMemberNames(ids: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = useMemo(() => Array.from(new Set(ids)).join(','), [ids]);

  useEffect(() => {
    if (!key) {
      setNames({});
      return;
    }
    let disposed = false;
    const db = getFirebaseDb();
    const load = async () => {
      const out: Record<string, string> = {};
      for (const id of key.split(',')) {
        if (!id) continue;
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const data = snap.data() as { displayName?: string };
            out[id] = data.displayName ?? 'Jogador';
          } else {
            out[id] = 'Jogador';
          }
        } catch {
          out[id] = 'Jogador';
        }
      }
      if (!disposed) setNames(out);
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [key]);

  return names;
}