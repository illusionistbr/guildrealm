const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onInit } = require('firebase-functions/v2/core');
const admin = require('firebase-admin');

onInit(() => {
  admin.initializeApp();
});

const VALID_ROLES = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

const CODE_TO_STATUS = {
  ok: 'OK',
  cancelled: 'CANCELLED',
  unknown: 'UNKNOWN',
  'invalid-argument': 'INVALID_ARGUMENT',
  'deadline-exceeded': 'DEADLINE_EXCEEDED',
  'not-found': 'NOT_FOUND',
  'already-exists': 'ALREADY_EXISTS',
  'permission-denied': 'PERMISSION_DENIED',
  'resource-exhausted': 'RESOURCE_EXHAUSTED',
  'failed-precondition': 'FAILED_PRECONDITION',
  aborted: 'ABORTED',
  'out-of-range': 'OUT_OF_RANGE',
  unimplemented: 'UNIMPLEMENTED',
  internal: 'INTERNAL',
  unavailable: 'UNAVAILABLE',
  'data-loss': 'DATA_LOSS',
  unauthenticated: 'UNAUTHENTICATED',
};

const STATUS_TO_HTTP = {
  OK: 200,
  CANCELLED: 499,
  UNKNOWN: 500,
  INVALID_ARGUMENT: 400,
  DEADLINE_EXCEEDED: 504,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  PERMISSION_DENIED: 403,
  RESOURCE_EXHAUSTED: 429,
  FAILED_PRECONDITION: 400,
  ABORTED: 409,
  OUT_OF_RANGE: 400,
  UNIMPLEMENTED: 501,
  INTERNAL: 500,
  UNAVAILABLE: 503,
  DATA_LOSS: 500,
  UNAUTHENTICATED: 401,
};

class CallableError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function callable(handler) {
  return onRequest({ cors: true }, async (req, res) => {
    try {
      const context = { rawRequest: req };

      const authorization = req.header('Authorization');
      if (authorization) {
        const match = authorization.match(/^Bearer (.*)$/i);
        if (!match) {
          throw new CallableError('unauthenticated', 'Unauthenticated');
        }
        try {
          const token = await admin.auth().verifyIdToken(match[1]);
          context.auth = { uid: token.uid, token, rawToken: match[1] };
        } catch (err) {
          throw new CallableError('unauthenticated', 'Unauthenticated');
        }
      }

      const data = req.body && req.body.data !== undefined ? req.body.data : undefined;
      const result = await handler(data, context);
      res.json({ result: result ?? null });
    } catch (err) {
      const code = err instanceof CallableError ? err.code : 'internal';
      const status = CODE_TO_STATUS[code] ?? 'INTERNAL';
      const httpStatus = STATUS_TO_HTTP[status] ?? 500;
      res.status(httpStatus).json({ error: { status, message: err.message || 'Internal Error' } });
    }
  });
}

function requireSuperAdmin(context) {
  if (!context.auth || context.auth.token.role !== 'super_admin') {
    throw new CallableError('permission-denied', 'Only super admins can manage roles');
  }
}

exports.setAdminClaims = callable(async (data, context) => {
  requireSuperAdmin(context);

  const { uid, role, permissions } = data ?? {};

  if (!uid || !role) {
    throw new CallableError('invalid-argument', 'uid and role are required');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new CallableError('invalid-argument', 'Invalid role');
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
    throw new CallableError('internal', 'Failed to set admin claims');
  }
});

exports.revokeAdminClaims = callable(async (data, context) => {
  requireSuperAdmin(context);

  const { uid } = data ?? {};
  if (!uid) throw new CallableError('invalid-argument', 'uid is required');

  try {
    await admin.auth().setCustomUserClaims(uid, { role: null, permissions: null });
    await admin.firestore().collection('admin_roles').doc(uid).delete();
    return { success: true };
  } catch (error) {
    throw new CallableError('internal', 'Failed to revoke admin claims');
  }
});

exports.logAdminAction = onDocumentCreated('admin_logs/{logId}', async (event) => {
  const data = event.data.data();
  console.log(`Admin action logged: ${data.action} by ${data.uid}`);
});

exports.createUserProfile = callable(async (data, context) => {
  if (!context.auth) {
    throw new CallableError('unauthenticated', 'User must be signed in');
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
