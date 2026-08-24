'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import {
  GuildCalendarEvent,
  EventParticipant,
  EventConfirmation,
  EventType,
  EVENT_TYPES,
} from './types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/admin/firebase/client';

const EVENTS_COL = COLLECTIONS.GUILD_EVENTS;

export function tsToDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val && typeof val === 'object' && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return new Date(0);
}

export function useGuildEvents(guildId: string | null) {
  const [events, setEvents] = useState<GuildCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(getFirebaseDb(), EVENTS_COL),
      where('guildId', '==', guildId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: GuildCalendarEvent[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            guildId: data.guildId,
            title: data.title ?? '',
            description: data.description ?? '',
            type: (data.type as EventType) ?? EVENT_TYPES.OTHER,
            start: tsToDate(data.start),
            end: tsToDate(data.end),
            location: data.location ?? '',
            maxParticipants: data.maxParticipants ?? null,
            allowRegistration: data.allowRegistration ?? true,
            status: data.status ?? 'active',
            createdBy: data.createdBy ?? '',
            createdByName: data.createdByName ?? '',
            createdAt: tsToDate(data.createdAt),
            updatedAt: tsToDate(data.updatedAt),
            attendanceEnabled: data.attendanceEnabled ?? false,
          });
        });
        setEvents(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading events:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [guildId]);

  const createEvent = useCallback(
    async (
      data: Omit<GuildCalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
      uid: string,
      displayName: string,
    ) => {
      const docRef = await addDoc(collection(getFirebaseDb(), EVENTS_COL), {
        guildId: data.guildId,
        title: data.title,
        description: data.description,
        type: data.type,
        start: data.start,
        end: data.end,
        location: data.location,
        maxParticipants: data.maxParticipants,
        allowRegistration: data.allowRegistration,
        status: data.status,
        createdBy: uid,
        createdByName: displayName,
        attendanceEnabled: data.attendanceEnabled ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [],
  );

  const updateEvent = useCallback(
    async (eventId: string, data: Partial<GuildCalendarEvent>) => {
      const uid = getFirebaseAuth().currentUser?.uid ?? 'sistema';
      const updateData: Record<string, unknown> = { updatedAt: serverTimestamp(), updatedBy: uid };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.start !== undefined) updateData.start = data.start;
      if (data.end !== undefined) updateData.end = data.end;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants;
      if (data.allowRegistration !== undefined) updateData.allowRegistration = data.allowRegistration;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.attendanceEnabled !== undefined) updateData.attendanceEnabled = data.attendanceEnabled;
      await updateDoc(doc(getFirebaseDb(), EVENTS_COL, eventId), updateData);
    },
    [],
  );

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteDoc(doc(getFirebaseDb(), EVENTS_COL, eventId));
  }, []);

  return { events, loading, error, createEvent, updateEvent, deleteEvent };
}

export function useEventParticipants(eventId: string | null) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(
      getFirebaseDb(),
      EVENTS_COL,
      eventId,
      'participants',
    );

    const unsubscribe = onSnapshot(colRef, (snap) => {
      const list: EventParticipant[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          userId: d.id,
          displayName: data.displayName ?? 'Player',
          joinedAt: tsToDate(data.joinedAt),
        });
      });
      list.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
      setParticipants(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [eventId]);

  const joinEvent = useCallback(
    async (eventId: string, uid: string, displayName: string) => {
      const ref = doc(
        getFirebaseDb(),
        EVENTS_COL,
        eventId,
        'participants',
        uid,
      );
      await setDoc(ref, {
        displayName,
        joinedAt: serverTimestamp(),
      });
    },
    [],
  );

  const leaveEvent = useCallback(async (eventId: string, uid: string) => {
    const ref = doc(
      getFirebaseDb(),
      EVENTS_COL,
      eventId,
      'participants',
      uid,
    );
    await deleteDoc(ref);
  }, []);

  return { participants, loading, joinEvent, leaveEvent };
}

const CONFIRMATIONS_COL = 'confirmations';

export function useEventConfirmations(eventId: string | null) {
  const [confirmations, setConfirmations] = useState<EventConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setConfirmations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(
      getFirebaseDb(),
      EVENTS_COL,
      eventId,
      CONFIRMATIONS_COL,
    );

    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list: EventConfirmation[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            userId: d.id,
            displayName: data.displayName ?? 'Player',
            confirmedAt: tsToDate(data.confirmedAt),
          });
        });
        list.sort(
          (a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime(),
        );
        setConfirmations(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [eventId]);

  return { confirmations, loading };
}

export interface AttendanceCodeResult {
  code: string;
  attendanceStart: number;
  attendanceEnd: number;
}

export async function generateAttendanceCode(
  eventId: string,
): Promise<AttendanceCodeResult> {
  const fn = httpsCallable<
    { eventId: string },
    AttendanceCodeResult
  >(getFunctions(getFirebaseApp()), 'generateAttendanceCode');
  const res = await fn({ eventId });
  return res.data;
}

export async function confirmAttendance(
  eventId: string,
  code: string,
): Promise<void> {
  const fn = httpsCallable<
    { eventId: string; code: string },
    { success: boolean }
  >(getFunctions(getFirebaseApp()), 'confirmAttendance');
  await fn({ eventId, code });
}
