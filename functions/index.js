const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onInit } = require('firebase-functions/v2/core');
const admin = require('firebase-admin');

onInit(() => {
  admin.initializeApp();
});

const VALID_ROLES = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

function requireSuperAdmin(context) {
  if (!context.auth || context.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admins can manage roles');
  }
}

exports.setAdminClaims = onCall(async (data, context) => {
  requireSuperAdmin(context);

  const { uid, role, permissions } = data;

  if (!uid || !role) {
    throw new HttpsError('invalid-argument', 'uid and role are required');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role, permissions: permissions ?? [] });

    await admin.firestore().collection('admin_roles').doc(uid).set(
      {
        role,
        permissions: permissions ?? [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      },
      { merge: true }
    );

    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to set admin claims');
  }
});

exports.revokeAdminClaims = onCall(async (data, context) => {
  requireSuperAdmin(context);

  const { uid } = data;
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required');

  try {
    await admin.auth().setCustomUserClaims(uid, { role: null, permissions: null });
    await admin.firestore().collection('admin_roles').doc(uid).delete();
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to revoke admin claims');
  }
});

exports.logAdminAction = onDocumentCreated('admin_logs/{logId}', async (event) => {
  const data = event.data.data();
  console.log(`Admin action logged: ${data.action} by ${data.uid}`);
});

exports.createUserProfile = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in');
  }

  const uid = context.auth.uid;
  const { displayName, photoURL } = data ?? {};

  await admin.firestore().collection('users').doc(uid).set(
    {
      email: context.auth.token.email ?? '',
      displayName: displayName ?? '',
      photoURL: photoURL ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      xp: 0,
      premium: false,
      role: 'user',
    },
    { merge: true }
  );

  return { success: true };
});
