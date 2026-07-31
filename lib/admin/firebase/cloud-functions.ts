// Cloud Functions for Firebase
// Deploy: firebase deploy --only functions

/*
exports.setAdminClaims = functions.https.onCall(async (data, context) => {
  // Verify caller is super admin
  if (!context.auth || context.auth.token.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can set roles');
  }

  const { uid, role, permissions } = data;

  if (!uid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
  }

  const validRoles = ['super_admin', 'admin', 'moderator', 'editor', 'support'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    // Set custom claims on the user
    await admin.auth().setCustomUserClaims(uid, { role, permissions: permissions ?? [] });

    // Update admin_roles collection
    await admin.firestore().collection('admin_roles').doc(uid).set({
      role,
      permissions: permissions ?? [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    }, { merge: true });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to set admin claims');
  }
});

exports.revokeAdminClaims = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can revoke roles');
  }

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required');

  try {
    await admin.auth().setCustomUserClaims(uid, { role: null, permissions: null });
    await admin.firestore().collection('admin_roles').doc(uid).delete();
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to revoke admin claims');
  }
});

exports.logAdminAction = functions.firestore
  .document('admin_logs/{logId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    console.log(Admin action logged: ${data.action} by ${data.uid});
  });

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Create user profile in Firestore
  await admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true,
    xp: 0,
    premium: false,
    role: 'user',
  });
});
*/
