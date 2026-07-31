import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';

type AuditAction = 
  | 'login' | 'logout'
  | 'create' | 'update' | 'delete'
  | 'ban' | 'unban' | 'suspend'
  | 'role_change' | 'permission_change'
  | 'password_reset' | 'email_change'
  | 'settings_change'
  | 'premium_change'
  | 'transfer_leadership'
  | 'moderation_action';

type AuditEntry = {
  uid: string;
  email: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export async function createAuditLog(entry: AuditEntry) {
  try {
    await addDoc(collection(getFirebaseDb(), 'admin_logs'), {
      ...entry,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function getAuditLogs(options: {
  limit?: number;
  action?: AuditAction;
  uid?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const constraints = [];
  
  if (options.action) constraints.push(where('action', '==', options.action));
  if (options.uid) constraints.push(where('uid', '==', options.uid));
  if (options.startDate) constraints.push(where('timestamp', '>=', options.startDate));
  if (options.endDate) constraints.push(where('timestamp', '<=', options.endDate));
  
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(options.limit ?? 50));

  const q = query(collection(getFirebaseDb(), 'admin_logs'), ...constraints);
  const snap = await getDocs(q);
  
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
