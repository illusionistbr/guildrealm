import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';

export function useCollection<T>(path: string, constraints: QueryConstraint[] = []) {
  return useQuery({
    queryKey: [path, constraints],
    queryFn: async () => {
      const q = query(collection(getFirebaseDb(), path), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    },
  });
}

export function useDocument<T>(path: string, id?: string) {
  return useQuery({
    queryKey: [path, id],
    queryFn: async () => {
      if (!id) return null;
      const snap = await getDoc(doc(getFirebaseDb(), path, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as T;
    },
    enabled: !!id,
  });
}

export function useCreateDocument(path: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const docRef = await addDoc(collection(getFirebaseDb(), path), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [path] });
    },
  });
}

export function useUpdateDocument(path: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await updateDoc(doc(getFirebaseDb(), path, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [path] });
      queryClient.invalidateQueries({ queryKey: [path, variables.id] });
    },
  });
}

export function useDeleteDocument(path: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(getFirebaseDb(), path, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [path] });
    },
  });
}
