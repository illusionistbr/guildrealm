const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onInit } = require('firebase-functions/v2/core');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { Resend } = require('resend');

// Notificações no Discord (webhooks) via triggers do Firestore
Object.assign(exports, require('./discord'));

onInit(() => {
  admin.initializeApp();
});

// Conquistas helper (lazy require após init para evitar ciclo)
function getAchievements() {
  try { return require('./achievements'); } catch { return null; }
}

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
  'group-full': 'GROUP_FULL',
  'already-in-group': 'ALREADY_IN_GROUP',
  'already-in-guild': 'ALREADY_IN_GUILD',
  'already-applied': 'ALREADY_APPLIED',
  'recruitment-closed': 'RECRUITMENT_CLOSED',
  'application-required': 'APPLICATION_REQUIRED',
  'already-reviewed': 'ALREADY_REVIEWED',
  'attendance-not-open': 'FAILED_PRECONDITION',
  'attendance-closed': 'FAILED_PRECONDITION',
  'attendance-invalid-code': 'INVALID_ARGUMENT',
  'attendance-already-confirmed': 'ALREADY_EXISTS',
  'signup-rate-limited': 'RESOURCE_EXHAUSTED',
  'signup-turnstile-invalid': 'INVALID_ARGUMENT',
  'password-required': 'PASSWORD_REQUIRED',
  'invalid-password': 'INVALID_PASSWORD',
  'password-required': 'PASSWORD_REQUIRED',
  'invalid-password': 'INVALID_PASSWORD',
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
  GROUP_FULL: 409,
  ALREADY_IN_GROUP: 409,
  ALREADY_IN_GUILD: 409,
  ALREADY_APPLIED: 409,
  RECRUITMENT_CLOSED: 400,
  APPLICATION_REQUIRED: 409,
  ALREADY_REVIEWED: 409,
};

class CallableError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function callable(handler, options) {
  return onRequest({ cors: true, ...options }, async (req, res) => {
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

async function logGuildActivity(guildId, entry) {
  try {
    await admin.firestore().collection('guilds').doc(guildId).collection('activity').add({
      ...entry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log guild activity:', err);
  }
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

  // Nickname imutável usado na URL pública do perfil (/profile/{nickname}).
  // O cadastro já valida [a-zA-Z0-9_-]{3,}; aqui normalizamos para minúsculas.
  const nickname =
    typeof displayName === 'string'
      ? displayName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      : '';

  await admin.firestore().collection('users').doc(uid).set(
    {
      email: context.auth.token.email ?? '',
      displayName: displayName ?? '',
      nickname,
      photoURL: photoURL ?? null,
      nicknameChanged: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      xp: 0,
      premium: false,
      role: 'user',
    },
    { merge: true }
  );

  // Conquista: Criou a conta
  try { const ach = getAchievements(); if (ach) await ach.awardAchievement(uid, 'common_account_created'); } catch {}

  return { success: true, nickname };
});

// Nickname pode ser alterado UMA única vez. Valida formato, unicidade
// e janela de alteração (nicknameChanged == false/null).
exports.updateProfileNickname = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
  const uid = context.auth.uid;
  const raw = typeof data?.nickname === 'string' ? data.nickname.trim().toLowerCase() : '';
  if (!/^[a-z0-9_-]{3,32}$/.test(raw)) {
    throw new CallableError('invalid-argument', 'Nickname must be 3-32 chars: a-z, 0-9, _ or -');
  }

  const userRef = admin.firestore().collection('users').doc(uid);
  const snap = await userRef.get();
  const profile = snap.exists ? (snap.data() || {}) : {};
  // Se perfil não existe, cria na hora (usuários legados que nunca chamaram createUserProfile)
  // Nesse caso, primeira alteração ainda é permitida – não há nicknameChanged prévio.
  if (profile.nicknameChanged === true) {
    throw new CallableError('failed-precondition', 'Nickname can only be changed once');
  }
  if (profile.nickname === raw) {
    // Já é o nickname atual: considera sucesso idempotente
    return { success: true, nickname: raw };
  }

  // Unicidade: verifica se outro usuário já usa o nickname
  const clash = await admin.firestore().collection('users').where('nickname', '==', raw).limit(1).get();
  if (!clash.empty && clash.docs[0].id !== uid) {
    throw new CallableError('already-exists', 'Nickname already taken');
  }

  const payload = {
    nickname: raw,
    nicknameChanged: true,
    nicknameChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  // Se doc não existia, preenche campos mínimos para não quebrar leitura futura
  if (!snap.exists) {
    payload.email = context.auth.token.email || '';
    payload.displayName = profile.displayName || '';
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    payload.isActive = true;
    payload.xp = 0;
    payload.premium = false;
    payload.role = 'user';
  }

  await userRef.set(payload, { merge: true });

  return { success: true, nickname: raw };
});

// ============ PROTEÇÃO DE CADASTRO (Honeypot → Rate Limit → Turnstile) ============
// Chamado pelo cliente ANTES de criar a conta no Firebase Auth. Aplica rate
// limit por IP e por e-mail e valida o token do Cloudflare Turnstile.
// Obs.: não exige login (o cadastro acontece antes da autenticação).
exports.verifySignup = callable(async (data, context) => {
  const email =
    typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const token = typeof data?.token === 'string' ? data.token.trim() : '';

  // 1) Rate limit por IP (5 tentativas / 15 min)
  await enforceSignupRateLimit(
    `ip_${hashValue(clientIp(context))}`,
    5,
    15 * 60 * 1000,
  );

  // 2) Rate limit por e-mail (3 tentativas / 60 min)
  if (email) {
    await enforceSignupRateLimit(
      `email_${hashValue(email)}`,
      3,
      60 * 60 * 1000,
    );
  }

  // 3) Turnstile (Cloudflare) — validado server-side
  await verifyTurnstileToken(token);

  return { success: true };
});

// Valida o token do Turnstile na tela de login (não exige autenticação).
exports.verifyLogin = callable(async (data, context) => {
  const token = typeof data?.token === 'string' ? data.token.trim() : '';
  await verifyTurnstileToken(token);
  return { success: true };
});

// ============ E-MAIL DE VERIFICAÇÃO (Resend) ============
// Envia o e-mail de confirmação com link customizado via Resend,
// substituindo o envio nativo do Firebase (entrega mais confiável).
exports.sendVerificationEmail = callable(async (data, context) => {
  if (!context.auth) {
    throw new CallableError('unauthenticated', 'User must be signed in');
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email;
  if (!email) {
    throw new CallableError('invalid-argument', 'User has no email');
  }

  // 1) Gera o link de verificação com o Firebase Admin SDK
  const actionCodeSettings = {
    url: process.env.CLANFORGE_BASE_URL || 'https://clanforge.app',
    handleCodeInApp: false,
  };
  const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

  // 2) Envia via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new CallableError('internal', 'RESEND_API_KEY not set');
  }
  const resend = new Resend(apiKey);

  const from = process.env.RESEND_FROM || 'ClanForge <noreply@clanforge.app>';
  const escapeHtml = (str) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeLink = escapeHtml(link);
  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: 'Confirm your email - ClanForge',
    html: `
      <div style="background:#050912;padding:48px 24px;font-family:Arial,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#0b1224;border:1px solid #243353;border-radius:12px;padding:40px;">
          <h1 style="color:#e8edfa;font-size:22px;margin:0 0 8px;">Welcome to ClanForge</h1>
          <p style="color:#bdc6d8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Confirm your email to activate your account and start managing your guild.
          </p>
          <a href="${safeLink}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
            Confirm email
          </a>
          <p style="color:#5a6580;font-size:12px;line-height:1.6;margin:24px 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color:#a763ff;word-break:break-all;">${safeLink}</span>
          </p>
          <p style="color:#3e4f6e;font-size:11px;margin:24px 0 0;">
            If you didn't create an account on ClanForge, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Resend send failed:', error);
    throw new CallableError('internal', 'Failed to send verification email');
  }

  return { success: true };
});

// ============ E-MAIL DE RECUPERAÇÃO DE SENHA (Resend) ============
// Gera o link de redefinição de senha e envia via Resend (inglês).
// Não exige login — o usuário esqueceu a senha. Rate limit por IP + e-mail.
exports.sendPasswordResetEmail = callable(async (data, context) => {
  const email =
    typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CallableError('invalid-argument', 'Valid email is required');
  }

  // Rate limit: 3 tentativas / 15 min por IP e por e-mail
  await enforceSignupRateLimit(
    `reset_ip_${hashValue(clientIp(context))}`,
    3,
    15 * 60 * 1000,
  );
  await enforceSignupRateLimit(
    `reset_email_${hashValue(email)}`,
    3,
    15 * 60 * 1000,
  );

  // 1) Gera o link de redefinição com o Firebase Admin SDK
  const actionCodeSettings = {
    url: process.env.CLANFORGE_BASE_URL || 'https://clanforge.app',
    handleCodeInApp: false,
  };
  const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

  // 2) Envia via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new CallableError('internal', 'RESEND_API_KEY not set');
  }
  const resend = new Resend(apiKey);

  const from = process.env.RESEND_FROM || 'ClanForge <noreply@clanforge.app>';
  const escapeHtml = (str) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeLink = escapeHtml(link);
  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: 'Reset your password - ClanForge',
    html: `
      <div style="background:#050912;padding:48px 24px;font-family:Arial,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#0b1224;border:1px solid #243353;border-radius:12px;padding:40px;">
          <h1 style="color:#e8edfa;font-size:22px;margin:0 0 8px;">Reset your password</h1>
          <p style="color:#bdc6d8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset the password for your ClanForge account.
            Click the button below to choose a new password.
          </p>
          <a href="${safeLink}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
            Reset password
          </a>
          <p style="color:#5a6580;font-size:12px;line-height:1.6;margin:24px 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color:#a763ff;word-break:break-all;">${safeLink}</span>
          </p>
          <p style="color:#3e4f6e;font-size:11px;margin:24px 0 0;">
            If you didn't request a password reset, you can ignore this email. Your password won't change.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Resend send failed:', error);
    throw new CallableError('internal', 'Failed to send password reset email');
  }

  return { success: true };
});

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clientIp(context) {
  const req = context.rawRequest;
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req?.ip || 'unknown';
}

async function enforceSignupRateLimit(key, max, windowMs) {
  const ref = admin.firestore().doc(`signup_attempts/${key}`);
  const now = Date.now();
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ count: 1, windowStart: now });
    return;
  }
  const data = snap.data();
  const windowStart = data.windowStart ?? now;
  if (now - windowStart > windowMs) {
    await ref.set({ count: 1, windowStart: now });
    return;
  }
  if ((data.count ?? 0) >= max) {
    throw new CallableError(
      'signup-rate-limited',
      'Too many signup attempts. Try again later.',
    );
  }
  await ref.update({ count: admin.firestore.FieldValue.increment(1) });
}

async function verifyTurnstileToken(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      'TURNSTILE_SECRET_KEY not set; skipping Turnstile verification',
    );
    return;
  }
  if (!token) {
    throw new CallableError('signup-turnstile-invalid', 'Missing Turnstile token');
  }
  let res;
  try {
    res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
  } catch {
    throw new CallableError('signup-turnstile-invalid', 'Turnstile verification failed');
  }
  const data = await res.json();
  if (!data?.success) {
    throw new CallableError('signup-turnstile-invalid', 'Turnstile verification failed');
  }
}

// ============ ENTRADA/SAIDA DE GUILD (por personagem) ============

function characterDoc(characterId) {
  return admin.firestore().doc(`characters/${characterId}`);
}

// Alista um personagem em uma guild (o personagem passa a ser o "membro")
exports.joinGuild = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { characterId, guildId, password } = data ?? {};
  if (!characterId || !guildId) {
    throw new CallableError('invalid-argument', 'characterId and guildId are required');
  }

  const uid = context.auth.uid;

  await admin.firestore().runTransaction(async (tx) => {
    const charSnap = await tx.get(characterDoc(characterId));
    if (!charSnap.exists) {
      throw new CallableError('not-found', 'Character not found');
    }
    const character = charSnap.data();
    if (character.ownerId !== uid) {
      throw new CallableError('permission-denied', 'Character does not belong to this user');
    }
    if (character.guildId) {
      throw new CallableError('already-in-group', 'Character is already in a guild');
    }

    const guildSnap = await tx.get(guildDoc(guildId));
    if (!guildSnap.exists) {
      throw new CallableError('not-found', 'Guild not found');
    }
    const guild = guildSnap.data();

    // Senha da guild: quem tiver a senha entra direto, mesmo com o
    // recrutamento fechado ou com candidatura obrigatória.
    const settingsSnap = await tx.get(recruitmentDoc(guildId));
    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    const passwordEnabled = settings?.passwordEnabled === true;

    let passwordOk = false;
    if (passwordEnabled) {
      if (typeof password !== 'string' || !password) {
        throw new CallableError('password-required', 'Guild password is required to join');
      }
      const secretSnap = await tx.get(recruitmentSecretDoc(guildId));
      const secret = secretSnap.exists ? secretSnap.data() : null;
      passwordOk = verifyGuildPassword(secret?.passwordHash, secret?.passwordSalt, password);
      if (!passwordOk) {
        throw new CallableError('invalid-password', 'Invalid guild password');
      }
    }

    if (!passwordOk) {
      if (guild.recruitment === 'closed') {
        throw new CallableError('failed-precondition', 'Guild is not recruiting');
      }
      if (await guildRequiresApplication(guildId)) {
        throw new CallableError(
          'application-required',
          'Guild requires an application before joining',
        );
      }
    }

    if ((guild.bannedCharacters ?? []).includes(characterId)) {
      throw new CallableError('permission-denied', 'Character is banned from this guild');
    }
    if (guild.game && character.game && guild.game !== character.game) {
      throw new CallableError('invalid-argument', 'Game does not match guild');
    }
    const members = guild.members ?? [];
    if (members.includes(characterId)) {
      throw new CallableError('already-in-group', 'Character is already a guild member');
    }

    const owners = guild.memberOwnerIds ?? [];
    tx.update(guildDoc(guildId), {
      members: [...members, characterId],
      memberOwnerIds: owners.includes(uid) ? owners : [...owners, uid],
      updatedAt: fv.serverTimestamp(),
    });
    tx.update(characterDoc(characterId), {
      guildId,
      updatedAt: fv.serverTimestamp(),
    });
  });

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'join', userId: uid, characterId, characterName: charName });
  } catch {}

  return { success: true };
});

// Remove o personagem da guild (deixa a guild e os grupos dela)
exports.leaveGuild = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { characterId } = data ?? {};
  if (!characterId) {
    throw new CallableError('invalid-argument', 'characterId is required');
  }

  const uid = context.auth.uid;

  const charSnap = await characterDoc(characterId).get();
  if (!charSnap.exists) {
    throw new CallableError('not-found', 'Character not found');
  }
  const character = charSnap.data();
  if (character.ownerId !== uid) {
    throw new CallableError('permission-denied', 'Character does not belong to this user');
  }
  if (!character.guildId) {
    throw new CallableError('invalid-argument', 'Character is not in a guild');
  }

  const guildId = character.guildId;

  if (guildId) {
    const guildSnap = await guildDoc(guildId).get();
    if (guildSnap.exists && guildSnap.data().ownerCharacterId === characterId) {
      throw new CallableError('failed-precondition', 'Guild leader cannot leave the guild');
    }
  }

  const charName = character.name || character.nickname || 'Unknown';
  await removeCharacterFromGuild(guildId, characterId);
  await logGuildActivity(guildId, { type: 'leave', userId: uid, characterId, characterName: charName });

  return { success: true };
});

// Helper: remove um personagem da guild (membros, memberOwnerIds, grupos, dados do personagem)
async function removeCharacterFromGuild(guildId, characterId) {
  await admin.firestore().runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildDoc(guildId));
    if (!guildSnap.exists) {
      // Guild não existe mais: apenas limpa o personagem
      tx.update(characterDoc(characterId), {
        guildId: null,
        updatedAt: fv.serverTimestamp(),
      });
      return;
    }

    const guild = guildSnap.data();

    const members = (guild.members ?? []).filter((id) => id !== characterId);
    const update = { members, updatedAt: fv.serverTimestamp() };

    // Recalcula os donos de membros restantes (uid só sai se não sobrar personagem dele)
    const remainingOwners = new Set(guild.memberOwnerIds ?? []);
    if (members.length > 0) {
      const chars = await Promise.all(members.map((id) => characterDoc(id).get()));
      const present = new Set();
      for (const c of chars) {
        if (c.exists && c.data().ownerId) present.add(c.data().ownerId);
      }
      for (const owner of [...remainingOwners]) {
        if (!present.has(owner)) remainingOwners.delete(owner);
      }
    } else {
      remainingOwners.clear();
    }
    update.memberOwnerIds = [...remainingOwners];

    // Limpa dados auxiliares do membro removido
    const memberRoles = { ...(guild.memberRoles ?? {}) };
    delete memberRoles[characterId];
    update.memberRoles = memberRoles;
    if (Array.isArray(guild.officerCharacters)) {
      update.officerCharacters = guild.officerCharacters.filter((id) => id !== characterId);
    }
    if (Array.isArray(guild.inactiveCharacters)) {
      update.inactiveCharacters = guild.inactiveCharacters.filter((id) => id !== characterId);
    }

    tx.update(guildDoc(guildId), update);
    tx.update(characterDoc(characterId), {
      guildId: null,
      updatedAt: fv.serverTimestamp(),
    });
  });

  // Remove o personagem de todos os grupos da guild e ajusta os contadores
  try {
    const groups = await guildGroupsCol(guildId).get();
    const ops = [];
    for (const g of groups.docs) {
      const memberRef = groupMembersCol(guildId, g.id).doc(characterId);
      const memberSnap = await memberRef.get();
      if (memberSnap.exists) {
        ops.push(memberRef.delete());
        const groupSnap = await groupDoc(guildId, g.id).get();
        if (groupSnap.exists) {
          const count = groupSnap.data().memberCount ?? 1;
          ops.push(
            groupDoc(guildId, g.id).update({
              memberCount: Math.max(0, count - 1),
              updatedAt: fv.serverTimestamp(),
            })
          );
        }
      }
    }
    await Promise.all(ops);
  } catch (err) {
    console.error('[removeCharacterFromGuild] limpeza de grupos falhou:', err.message);
  }
}

// Líder expulsa um personagem da guild
exports.kickGuildMember = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, characterId } = data ?? {};
  if (!guildId || !characterId) {
    throw new CallableError('invalid-argument', 'guildId and characterId are required');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageMembers');
  if (guild.ownerCharacterId === characterId) {
    throw new CallableError('failed-precondition', 'Guild leader cannot be removed');
  }
  if (!(guild.members ?? []).includes(characterId)) {
    throw new CallableError('invalid-argument', 'Character is not a guild member');
  }

  await removeCharacterFromGuild(guildId, characterId);

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'kick', userId: context.auth.uid, characterId, characterName: charName });
  } catch {}

  return { success: true };
});

// Expulsa e bane um personagem da guild (não pode mais entrar)
exports.banGuildMember = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, characterId } = data ?? {};
  if (!guildId || !characterId) {
    throw new CallableError('invalid-argument', 'guildId and characterId are required');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageMembers');
  if (guild.ownerCharacterId === characterId) {
    throw new CallableError('failed-precondition', 'Guild leader cannot be banned');
  }
  if (!(guild.members ?? []).includes(characterId)) {
    throw new CallableError('invalid-argument', 'Character is not a guild member');
  }

  await removeCharacterFromGuild(guildId, characterId);

  await guildDoc(guildId).update({
    bannedCharacters: admin.firestore.FieldValue.arrayUnion(characterId),
    updatedAt: fv.serverTimestamp(),
  });

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'ban', userId: context.auth.uid, characterId, characterName: charName });
  } catch {}

  return { success: true };
});

// Atribui um cargo a um personagem da guild (permissão manageMembers)
exports.setGuildMemberRank = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, characterId, rankId = null } = data ?? {};
  if (!guildId || !characterId) {
    throw new CallableError('invalid-argument', 'guildId and characterId are required');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageMembers');
  if (guild.ownerCharacterId === characterId) {
    throw new CallableError('failed-precondition', 'Guild leader rank cannot be changed');
  }
  if (!(guild.members ?? []).includes(characterId)) {
    throw new CallableError('invalid-argument', 'Character is not a guild member');
  }

  const update = { updatedAt: fv.serverTimestamp() };
  let rankName = null;
  if (rankId) {
    const rankSnap = await guildDoc(guildId).collection('ranks').doc(rankId).get();
    if (!rankSnap.exists) throw new CallableError('not-found', 'Rank not found');
    rankName = rankSnap.data().name || rankId;
    update[`memberRanks.${characterId}`] = rankId;
  } else {
    update[`memberRanks.${characterId}`] = admin.firestore.FieldValue.delete();
  }
  await guildDoc(guildId).update(update);

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'rank_change', userId: context.auth.uid, characterId, characterName: charName, details: { rankId, rankName } });
  } catch {}

  return { success: true };
});

// Ativa/inativa um personagem da guild (permissão manageMembers)
exports.setGuildMemberStatus = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, characterId, inactive } = data ?? {};
  if (!guildId || !characterId || typeof inactive !== 'boolean') {
    throw new CallableError('invalid-argument', 'guildId, characterId and inactive are required');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageMembers');
  if (guild.ownerCharacterId === characterId && inactive) {
    throw new CallableError('failed-precondition', 'Guild leader cannot be inactivated');
  }
  if (!(guild.members ?? []).includes(characterId)) {
    throw new CallableError('invalid-argument', 'Character is not a guild member');
  }

  await guildDoc(guildId).update({
    inactiveCharacters: inactive
      ? admin.firestore.FieldValue.arrayUnion(characterId)
      : admin.firestore.FieldValue.arrayRemove(characterId),
    updatedAt: fv.serverTimestamp(),
  });

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'status_change', userId: context.auth.uid, characterId, characterName: charName, details: { inactive } });
  } catch {}

  return { success: true };
});

// ============ RECRUTAMENTO ============

const RECRUITMENT_QUESTION_TYPES = [
  'short_text',
  'long_text',
  'number',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'yes_no',
  'checkbox',
];

function recruitmentDoc(guildId) {
  return admin.firestore().doc(`guilds/${guildId}/settings/recruitment`);
}

// Guarda o hash da senha em um doc separado, sem leitura de clientes.
function recruitmentSecretDoc(guildId) {
  return admin.firestore().doc(`guilds/${guildId}/settings/recruitmentSecret`);
}

function hashGuildPassword(password, salt) {
  return require('crypto').createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function newGuildPasswordSalt() {
  return require('crypto').randomBytes(16).toString('hex');
}

function verifyGuildPassword(hash, salt, password) {
  if (typeof hash !== 'string' || typeof salt !== 'string' || typeof password !== 'string') {
    return false;
  }
  const candidate = Buffer.from(hashGuildPassword(password, salt), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && require('crypto').timingSafeEqual(candidate, expected);
}

function recruitmentApplicationsCol(guildId) {
  return admin.firestore().collection(`guilds/${guildId}/applications`);
}

// Uma guild exige candidatura quando o recrutamento está ativo com perguntas
// configuradas. Nesse caso, ninguém pode entrar direto via joinGuild.
async function guildRequiresApplication(guildId) {
  try {
    const settingsSnap = await recruitmentDoc(guildId).get();
    if (!settingsSnap.exists) return false;
    const settings = settingsSnap.data();
    return (
      settings.enabled === true &&
      Array.isArray(settings.questions) &&
      settings.questions.length > 0
    );
  } catch {
    return false;
  }
}

function sanitizeRecruitmentConfig(type, config) {
  const cfg = config ?? {};
  const out = {};
  if (type === 'short_text' || type === 'long_text') {
    if (Number.isInteger(cfg.minLength)) {
      out.minLength = Math.max(0, Math.min(2000, cfg.minLength));
    }
    if (Number.isInteger(cfg.maxLength)) {
      out.maxLength = Math.max(0, Math.min(5000, cfg.maxLength));
    }
  }
  if (type === 'number') {
    if (typeof cfg.min === 'number' && Number.isFinite(cfg.min)) out.min = cfg.min;
    if (typeof cfg.max === 'number' && Number.isFinite(cfg.max)) out.max = cfg.max;
  }
  if (type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown') {
    const options = Array.isArray(cfg.options)
      ? cfg.options
          .map((o) => (typeof o === 'string' ? o.trim() : ''))
          .filter(Boolean)
          .slice(0, 50)
      : [];
    out.options = options;
  }
  if (type === 'checkbox') {
    out.text = typeof cfg.text === 'string' ? cfg.text.slice(0, 300) : '';
  }
  return out;
}

function sanitizeRecruitmentQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q) => q && typeof q === 'object')
    .map((q, index) => {
      const type = RECRUITMENT_QUESTION_TYPES.includes(q.type)
        ? q.type
        : 'short_text';
      return {
        id:
          typeof q.id === 'string' && q.id
            ? q.id.slice(0, 64)
            : `q_${Date.now()}_${index}`,
        type,
        title: typeof q.title === 'string' ? q.title.trim().slice(0, 300) : '',
        required: q.required === true,
        order: Number.isInteger(q.order) ? q.order : index,
        config: sanitizeRecruitmentConfig(type, q.config),
      };
    })
    .filter((q) => q.title)
    .sort((a, b) => a.order - b.order);
}

// Salva as configurações de recrutamento (permissão manageRecruitment)
exports.saveRecruitmentSettings = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, enabled, message, questions, passwordEnabled, password } = data ?? {};
  if (!guildId || typeof enabled !== 'boolean') {
    throw new CallableError('invalid-argument', 'guildId and enabled are required');
  }

  await requireGuildPermission(guildId, context.auth.uid, 'manageRecruitment');

  const cleanMessage =
    typeof message === 'string' ? message.trim().slice(0, 5000) : '';
  const cleanQuestions = sanitizeRecruitmentQuestions(questions);

  const wantPassword = passwordEnabled === true;
  const cleanPassword =
    typeof password === 'string' && password ? password.slice(0, 128) : '';

  await admin.firestore().runTransaction(async (tx) => {
    const secretSnap = await tx.get(recruitmentSecretDoc(guildId));
    const existing = secretSnap.exists ? secretSnap.data() : null;

    let passwordSet = false;
    if (wantPassword) {
      if (cleanPassword) {
        const salt = newGuildPasswordSalt();
        tx.set(recruitmentSecretDoc(guildId), {
          passwordHash: hashGuildPassword(cleanPassword, salt),
          passwordSalt: salt,
          updatedAt: fv.serverTimestamp(),
          updatedBy: context.auth.uid,
        });
        passwordSet = true;
      } else if (existing && existing.passwordHash && existing.passwordSalt) {
        passwordSet = true;
      } else {
        throw new CallableError(
          'invalid-argument',
          'A password is required to enable the guild password',
        );
      }
    } else {
      tx.delete(recruitmentSecretDoc(guildId));
    }

    tx.set(
      recruitmentDoc(guildId),
      {
        enabled,
        message: cleanMessage,
        questions: cleanQuestions,
        passwordEnabled: wantPassword,
        passwordSet,
        updatedAt: fv.serverTimestamp(),
        updatedBy: context.auth.uid,
      },
      { merge: true },
    );
    // Mantém o campo legado da guild sincronizado com o novo estado,
    // para que badges públicos, listagem e joinGuild reflitam a mesma config.
    tx.update(guildDoc(guildId), {
      recruitment: enabled ? 'open' : 'closed',
    });
  });

  return { success: true };
});

// Envia uma mensagem de teste para o webhook do Discord da guild
exports.testDiscordWebhook = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, webhookUrl } = data ?? {};
  if (!guildId || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    throw new CallableError('invalid-argument', 'guildId and webhookUrl are required');
  }
  if (!/^https:\/\/discord\.com\/api\/webhooks\//.test(webhookUrl.trim())) {
    throw new CallableError('invalid-argument', 'Invalid Discord webhook URL');
  }

  await requireGuildPermission(guildId, context.auth.uid, 'manageSettings');

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            color: 0x6d28d9,
            title: '✅ Conexão com o Discord funcionando!',
            description:
              'As notificações desta guild (eventos, presenças e mais) serão enviadas para este canal.',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new CallableError(
        'invalid-argument',
        `Discord rejected the webhook (${res.status})`,
      );
    }
    return { success: true };
  } catch (err) {
    if (err instanceof CallableError) throw err;
    throw new CallableError('internal', 'Failed to send test message');
  }
});

// ============ PRESENÇAS (confirmação de presença em eventos) ============

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para o código compartilhável.
const ATTENDANCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateAttendanceCodeValue() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ATTENDANCE_ALPHABET[crypto.randomInt(ATTENDANCE_ALPHABET.length)];
  }
  return code;
}

// Valida que o evento existe e tem confirmação de presença habilitada.
async function getEventForAttendance(eventId) {
  const eventSnap = await admin
    .firestore()
    .doc(`guild_events/${eventId}`)
    .get();
  if (!eventSnap.exists) throw new CallableError('not-found', 'Event not found');
  const event = eventSnap.data();
  if (!event.attendanceEnabled) {
    throw new CallableError(
      'invalid-argument',
      'Attendance confirmation is not enabled for this event',
    );
  }
  const guildSnap = await guildDoc(event.guildId).get();
  const guild = guildSnap.data();
  if (!guild) throw new CallableError('not-found', 'Guild not found');
  return { event, guild };
}

function getAttendanceWindow(event) {
  const endMs = event.end?.toMillis?.() ?? null;
  if (!endMs) {
    throw new CallableError(
      'invalid-argument',
      'Event has no end time',
    );
  }
  // Código disponível 1 minuto antes do fim, fecha 15 min após o fim.
  const startMs = endMs - 60_000;
  const closeMs = endMs + 15 * 60_000;
  return { startMs, endMs: closeMs };
}

// Gera (ou reutiliza) o código de confirmação de presença do evento.
// Código disponível 1 minuto antes do fim do evento, fecha 15 min após o fim.
// Apenas quem tem a permissão de gerenciar eventos (líder, oficiais etc.).
exports.generateAttendanceCode = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { eventId } = data ?? {};
  if (!eventId || typeof eventId !== 'string') {
    throw new CallableError('invalid-argument', 'eventId is required');
  }

  const { event } = await getEventForAttendance(eventId);
  await requireGuildPermission(event.guildId, context.auth.uid, 'manageEvents');
  const { startMs, endMs } = getAttendanceWindow(event);

  const now = Date.now();
  if (now < startMs - 60000) {
    throw new CallableError(
      'attendance-not-open',
      'Attendance code is not available yet',
    );
  }
  if (now > endMs) {
    throw new CallableError('attendance-closed', 'Attendance window is closed');
  }

  const codeRef = admin
    .firestore()
    .doc(`guild_events/${eventId}/attendance/code`);
  const existing = await codeRef.get();
  if (existing.exists && typeof existing.data()?.code === 'string') {
    return {
      code: existing.data().code,
      attendanceStart: startMs,
      attendanceEnd: endMs,
    };
  }

  const code = generateAttendanceCodeValue();
  await codeRef.set({
    code,
    createdAt: fv.serverTimestamp(),
    createdBy: context.auth.uid,
  });

  return { code, attendanceStart: startMs, attendanceEnd: endMs };
});

// Confirma a presença do membro no evento com o código compartilhado.
// Janela: 1 min antes do fim até 15 min após o fim do evento.
exports.confirmAttendance = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { eventId, code } = data ?? {};
  if (!eventId || typeof eventId !== 'string') {
    throw new CallableError('invalid-argument', 'eventId is required');
  }
  if (typeof code !== 'string' || !code.trim()) {
    throw new CallableError('invalid-argument', 'code is required');
  }

  const { event, guild } = await getEventForAttendance(eventId);
  if (!(guild.memberOwnerIds ?? []).includes(context.auth.uid)) {
    throw new CallableError('permission-denied', 'User is not a guild member');
  }
  const { startMs, endMs } = getAttendanceWindow(event);

  const now = Date.now();
  if (now < startMs) {
    throw new CallableError('attendance-not-open', 'Attendance window has not opened yet');
  }
  if (now > endMs) {
    throw new CallableError('attendance-closed', 'Attendance window is closed');
  }

  const codeSnap = await admin
    .firestore()
    .doc(`guild_events/${eventId}/attendance/code`)
    .get();
  if (!codeSnap.exists || codeSnap.data().code !== code.trim().toUpperCase()) {
    throw new CallableError('attendance-invalid-code', 'Invalid confirmation code');
  }

  const confirmedRef = admin
    .firestore()
    .doc(`guild_events/${eventId}/confirmations/${context.auth.uid}`);
  const already = await confirmedRef.get();
  if (already.exists) {
    throw new CallableError('attendance-already-confirmed', 'Attendance already confirmed');
  }

  const charSnap = await admin
    .firestore()
    .collection('characters')
    .where('ownerId', '==', context.auth.uid)
    .where('guildId', '==', event.guildId)
    .limit(1)
    .get();
  const charName = charSnap.empty
    ? (context.auth.token.name ?? '')
    : (charSnap.docs[0].data().name ?? '');

  await confirmedRef.set({
    guildId: event.guildId,
    displayName: charName || context.auth.token.name || '',
    confirmedAt: fv.serverTimestamp(),
  });

  return { success: true };
});

function validateAnswers(questions, answers) {
  const provided = new Map();
  for (const a of answers ?? []) {
    if (a && typeof a.questionId === 'string') {
      provided.set(a.questionId, a.answer);
    }
  }

  const clean = [];
  for (const q of questions) {
    const raw = provided.get(q.id);
    let answer = null;

    if (q.type === 'multiple_choice') {
      const list = Array.isArray(raw)
        ? raw.map((v) => String(v).slice(0, 2000)).filter(Boolean)
        : [];
      if (q.required && list.length === 0) {
        throw new CallableError('invalid-argument', `Required question unanswered: ${q.id}`);
      }
      const valid = (q.config.options ?? []).filter((o) => list.includes(o));
      answer = valid;
    } else if (q.type === 'checkbox') {
      answer = raw === true || raw === 'true';
      if (q.required && answer !== true) {
        throw new CallableError('invalid-argument', `Required checkbox unchecked: ${q.id}`);
      }
    } else if (q.type === 'yes_no') {
      answer = raw === 'yes' || raw === 'no' ? raw : null;
      if (q.required && !answer) {
        throw new CallableError('invalid-argument', `Required question unanswered: ${q.id}`);
      }
    } else if (q.type === 'number') {
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const n = Number(String(raw).replace(/\./g, '').replace(',', '.'));
        if (!Number.isFinite(n)) {
          throw new CallableError('invalid-argument', `Invalid number: ${q.id}`);
        }
        if (q.config.min !== undefined && n < q.config.min) {
          throw new CallableError('invalid-argument', `Below minimum: ${q.id}`);
        }
        if (q.config.max !== undefined && n > q.config.max) {
          throw new CallableError('invalid-argument', `Above maximum: ${q.id}`);
        }
        answer = String(n);
      } else if (q.required) {
        throw new CallableError('invalid-argument', `Required question unanswered: ${q.id}`);
      }
    } else if (q.type === 'short_text' || q.type === 'long_text') {
      const s = typeof raw === 'string' ? raw.trim().slice(0, 5000) : '';
      if (q.required && !s) {
        throw new CallableError('invalid-argument', `Required question unanswered: ${q.id}`);
      }
      if (s && q.config.minLength && s.length < q.config.minLength) {
        throw new CallableError('invalid-argument', `Below min length: ${q.id}`);
      }
      if (s && q.config.maxLength && s.length > q.config.maxLength) {
        throw new CallableError('invalid-argument', `Above max length: ${q.id}`);
      }
      answer = s;
    } else {
      // single_choice / dropdown
      const s = typeof raw === 'string' ? raw : '';
      if (q.required && !s) {
        throw new CallableError('invalid-argument', `Required question unanswered: ${q.id}`);
      }
      if (s && !(q.config.options ?? []).includes(s)) {
        throw new CallableError('invalid-argument', `Invalid option: ${q.id}`);
      }
      answer = s || null;
    }

    if (answer !== null) clean.push({ questionId: q.id, answer });
  }
  return clean;
}

// Envia uma candidatura (recrutamento aberto, candidato externo, sem pendência)
exports.submitGuildApplication = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, answers, characterId } = data ?? {};
  if (!guildId) {
    throw new CallableError('invalid-argument', 'guildId is required');
  }
  if (!characterId) {
    throw new CallableError('invalid-argument', 'characterId is required');
  }

  const uid = context.auth.uid;

  const guildSnap = await guildDoc(guildId).get();
  if (!guildSnap.exists) throw new CallableError('not-found', 'Guild not found');
  const guild = guildSnap.data();

  // Personagem escolhido para a candidatura
  const charSnap = await characterDoc(characterId).get();
  if (!charSnap.exists) throw new CallableError('not-found', 'Character not found');
  const character = charSnap.data();
  if (character.ownerId !== uid) {
    throw new CallableError('permission-denied', 'Character does not belong to this user');
  }
  if (character.guildId) {
    throw new CallableError('already-in-group', 'Character is already in a guild');
  }
  if (guild.game && character.game && guild.game !== character.game) {
    throw new CallableError('invalid-argument', 'Game does not match guild');
  }
  if ((guild.bannedCharacters ?? []).includes(characterId)) {
    throw new CallableError('permission-denied', 'Applicant is banned from this guild');
  }

  // Candidato não pode estar banido via outro personagem
  const allChars = await admin
    .firestore()
    .collection('characters')
    .where('ownerId', '==', uid)
    .get();
  for (const c of allChars.docs) {
    if ((guild.bannedCharacters ?? []).includes(c.id)) {
      throw new CallableError('permission-denied', 'Applicant is banned from this guild');
    }
  }

  const settingsSnap = await recruitmentDoc(guildId).get();
  if (!settingsSnap.exists || settingsSnap.data().enabled !== true) {
    throw new CallableError('recruitment-closed', 'Recruitment is closed');
  }
  const settings = settingsSnap.data();

  const cleanAnswers = validateAnswers(settings.questions ?? [], answers);

  // Impede candidaturas simultâneas pendentes
  const pending = await recruitmentApplicationsCol(guildId)
    .where('applicantId', '==', uid)
    .where('status', '==', 'PENDING')
    .limit(1)
    .get();
  if (!pending.empty) {
    throw new CallableError('already-applied', 'Applicant already has a pending application');
  }

  // Nome do candidato a partir do perfil de usuário
  let applicantName = 'Jogador';
  try {
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (userSnap.exists) {
      applicantName =
        userSnap.data().displayName?.trim() ||
        userSnap.data().nickname?.trim() ||
        'Jogador';
    }
  } catch {
    // mantém o fallback
  }

  const appRef = recruitmentApplicationsCol(guildId).doc();
  await appRef.set({
    guildId,
    applicantId: uid,
    applicantName,
    applicantCharacterId: characterId,
    status: 'PENDING',
    answers: cleanAnswers,
    submittedAt: fv.serverTimestamp(),
    updatedAt: fv.serverTimestamp(),
  });

  return { success: true, applicationId: appRef.id };
});

// Revisa uma candidatura: aceita (adiciona o personagem à guild) ou rejeita.
// Exige permissão de gerenciar recrutamento (dono, líder ou cargo com a permissão).
exports.reviewGuildApplication = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, applicationId, decision } = data ?? {};
  if (!guildId || !applicationId) {
    throw new CallableError('invalid-argument', 'guildId and applicationId are required');
  }
  if (decision !== 'accepted' && decision !== 'rejected') {
    throw new CallableError('invalid-argument', 'decision must be accepted or rejected');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageRecruitment');
  const reviewerUid = context.auth.uid;

  const appRef = recruitmentApplicationsCol(guildId).doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new CallableError('not-found', 'Application not found');
  const application = appSnap.data();
  if (application.status !== 'PENDING') {
    throw new CallableError('already-reviewed', 'Application was already reviewed');
  }

  if (decision === 'rejected') {
    await appRef.update({
      status: 'REJECTED',
      reviewedBy: reviewerUid,
      updatedAt: fv.serverTimestamp(),
    });
    return { success: true };
  }

  // ----- Aceite: adiciona o personagem do candidato à guild -----
  const characterId = application.applicantCharacterId;
  if (!characterId) {
    throw new CallableError('invalid-argument', 'Application has no character to accept');
  }

  await admin.firestore().runTransaction(async (tx) => {
    const charSnap = await tx.get(characterDoc(characterId));
    if (!charSnap.exists) throw new CallableError('not-found', 'Character not found');
    const character = charSnap.data();
    if (character.ownerId !== application.applicantId) {
      throw new CallableError('permission-denied', 'Character does not belong to applicant');
    }
    if (character.guildId) {
      throw new CallableError('already-in-group', 'Character is already in a guild');
    }
    if (guild.game && character.game && guild.game !== character.game) {
      throw new CallableError('invalid-argument', 'Game does not match guild');
    }
    if ((guild.bannedCharacters ?? []).includes(characterId)) {
      throw new CallableError('permission-denied', 'Character is banned from this guild');
    }
    const members = guild.members ?? [];
    if (members.includes(characterId)) {
      throw new CallableError('already-in-group', 'Character is already a guild member');
    }

    const owners = guild.memberOwnerIds ?? [];
    tx.update(guildDoc(guildId), {
      members: [...members, characterId],
      memberOwnerIds: owners.includes(application.applicantId)
        ? owners
        : [...owners, application.applicantId],
      updatedAt: fv.serverTimestamp(),
    });
    tx.update(characterDoc(characterId), {
      guildId,
      updatedAt: fv.serverTimestamp(),
    });
    tx.update(appRef, {
      status: 'ACCEPTED',
      reviewedBy: reviewerUid,
      updatedAt: fv.serverTimestamp(),
    });
  });

  try {
    const charSnap = await characterDoc(characterId).get();
    const charName = charSnap.exists ? (charSnap.data().name || charSnap.data().nickname || 'Unknown') : 'Unknown';
    await logGuildActivity(guildId, { type: 'join', userId: application.applicantId, characterId, characterName: charName, details: { via: 'application' } });
  } catch {}

  return { success: true };
});

// Exclui um personagem (só é permitido se ele não estiver em nenhuma guild)
exports.deleteCharacter = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { characterId } = data ?? {};
  if (!characterId) {
    throw new CallableError('invalid-argument', 'characterId is required');
  }

  const uid = context.auth.uid;

  const charSnap = await characterDoc(characterId).get();
  if (!charSnap.exists) {
    throw new CallableError('not-found', 'Character not found');
  }
  const character = charSnap.data();
  if (character.ownerId !== uid) {
    throw new CallableError('permission-denied', 'Character does not belong to this user');
  }
  if (character.guildId) {
    throw new CallableError('failed-precondition', 'Character is in a guild');
  }

  await characterDoc(characterId).delete();

  return { success: true };
});

// ============ GRUPOS DE GUILD (validação server-side) ============

const fv = admin.firestore.FieldValue;

function guildDoc(guildId) {
  return admin.firestore().doc(`guilds/${guildId}`);
}

function groupDoc(guildId, groupId) {
  return admin.firestore().doc(`guilds/${guildId}/groups/${groupId}`);
}

function groupMembersCol(guildId, groupId) {
  return admin.firestore().collection(`guilds/${guildId}/groups/${groupId}/members`);
}

function guildGroupsCol(guildId) {
  return admin.firestore().collection(`guilds/${guildId}/groups`);
}

// Retorna o cargo do personagem do usuário dentro da guild (ou null se não tiver)
async function getCallerRank(guildId, guild, uid) {
  const chars = await admin
    .firestore()
    .collection('characters')
    .where('ownerId', '==', uid)
    .where('guildId', '==', guildId)
    .limit(1)
    .get();
  if (chars.empty) return null;
  const charId = chars.docs[0].id;
  const rankId = guild.memberRanks?.[charId];
  if (!rankId) return null;
  const rankSnap = await guildDoc(guildId).collection('ranks').doc(rankId).get();
  if (!rankSnap.exists) return null;
  return rankSnap.data();
}

// Autoriza o dono, líderes legados ou quem tiver a permissão no cargo
async function requireGuildPermission(guildId, uid, permission) {
  const snap = await guildDoc(guildId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Guild not found');
  const guild = snap.data();
  if (guild.ownerId === uid || (guild.leaders ?? []).includes(uid)) return guild;
  const rank = await getCallerRank(guildId, guild, uid);
  if (rank && rank.permissions?.[permission]) return guild;
  throw new CallableError(
    'permission-denied',
    `Missing permission: ${permission}`,
  );
}

// Verifica se o usuário já está em qualquer grupo da guild (exceto skipGroupId)
async function findMemberGroup(guildId, userId, skipGroupId) {
  const groups = await guildGroupsCol(guildId).get();
  for (const g of groups.docs) {
    if (g.id === skipGroupId) continue;
    const memberSnap = await groupMembersCol(guildId, g.id).doc(userId).get();
    if (memberSnap.exists) return g.id;
  }
  return null;
}

exports.assignGuildMember = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, userId, fromGroupId = null, toGroupId, roleId = null } = data ?? {};
  if (!guildId || !userId || !toGroupId) {
    throw new CallableError('invalid-argument', 'guildId, userId and toGroupId are required');
  }

  const guild = await requireGuildPermission(guildId, context.auth.uid, 'manageGroups');
  const uid = context.auth.uid;

  // O alvo da movimentação deve ser um membro real da guild
  if (!(guild.members ?? []).includes(userId)) {
    throw new CallableError('invalid-argument', 'User is not a guild member');
  }

  let targetGroupId = toGroupId;

  await admin.firestore().runTransaction(async (tx) => {
    // Determina o grupo atual do usuário. Se o cliente informou fromGroupId,
    // confirma apenas ali (evita varrer todos os grupos da guild).
    let currentGroupId = null;
    if (fromGroupId) {
      const fromSnap = await tx.get(groupDoc(guildId, fromGroupId));
      if (fromSnap.exists) {
        const mSnap = await tx.get(groupMembersCol(guildId, fromGroupId).doc(userId));
        if (mSnap.exists) currentGroupId = fromGroupId;
      }
    }
    if (!currentGroupId) {
      const groupsSnap = await tx.get(guildGroupsCol(guildId));
      for (const g of groupsSnap.docs) {
        const memberSnap = await tx.get(groupMembersCol(guildId, g.id).doc(userId));
        if (memberSnap.exists) {
          currentGroupId = g.id;
          break;
        }
      }
    }

    if (fromGroupId && fromGroupId !== currentGroupId && currentGroupId) {
      throw new CallableError('invalid-argument', 'fromGroupId does not match current group');
    }

    // Capacidade do destino (leitura antes de qualquer escrita)
    const destGroupSnap = await tx.get(groupDoc(guildId, targetGroupId));
    if (!destGroupSnap.exists) throw new CallableError('not-found', 'Target group not found');
    const destGroup = destGroupSnap.data();
    const destCount = destGroup.memberCount ?? 0;
    if (destCount >= (destGroup.maxPlayers ?? Infinity) || destGroup.maxPlayers == null) {
      throw new CallableError('group-full', 'Group is full');
    }

    // Leitura do grupo de origem (se o membro será movido)
    let srcGroupSnap = null;
    if (currentGroupId && currentGroupId !== targetGroupId) {
      srcGroupSnap = await tx.get(groupDoc(guildId, currentGroupId));
    }

    // ---- a partir daqui apenas escritas ----
    if (currentGroupId && currentGroupId !== targetGroupId) {
      const srcCount = srcGroupSnap?.exists ? (srcGroupSnap.data().memberCount ?? 1) : 1;
      tx.delete(groupMembersCol(guildId, currentGroupId).doc(userId));
      if (srcGroupSnap?.exists) {
        tx.update(groupDoc(guildId, currentGroupId), {
          memberCount: Math.max(0, srcCount - 1),
        });
      }
    }

    const memberRef = groupMembersCol(guildId, targetGroupId).doc(userId);
    tx.set(memberRef, {
      roleId: roleId ?? null,
      position: destCount,
      joinedAt: fv.serverTimestamp(),
    });
    tx.update(groupDoc(guildId, targetGroupId), {
      memberCount: destCount + 1,
      updatedAt: fv.serverTimestamp(),
    });
  });

  return { success: true, groupId: targetGroupId };
});

exports.removeGuildMember = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, groupId, userId } = data ?? {};
  if (!guildId || !groupId || !userId) {
    throw new CallableError('invalid-argument', 'guildId, groupId and userId are required');
  }

  await requireGuildPermission(guildId, context.auth.uid, 'manageGroups');

  await admin.firestore().runTransaction(async (tx) => {
    const memberRef = groupMembersCol(guildId, groupId).doc(userId);
    const [memberSnap, groupSnap] = await Promise.all([
      tx.get(memberRef),
      tx.get(groupDoc(guildId, groupId)),
    ]);
    if (!memberSnap.exists) return;

    tx.delete(memberRef);

    if (groupSnap.exists) {
      const count = groupSnap.data().memberCount ?? 1;
      tx.update(groupDoc(guildId, groupId), {
        memberCount: Math.max(0, count - 1),
        updatedAt: fv.serverTimestamp(),
      });
    }
  });

  return { success: true };
});

// Safety net: revalida toda escrita direta de membro em grupo
// (capacity, unicidade e pertencimento à guild) e recalcula memberCount real.
exports.validateGuildGroupMember = onDocumentWritten(
  'guilds/{guildId}/groups/{groupId}/members/{userId}',
  async (event) => {
    const { guildId, groupId, userId } = event.params;
    const before = event.data.before?.exists ? event.data.before.data() : null;
    const after = event.data.after?.exists ? event.data.after.data() : null;

    const syncCount = async () => {
      const members = await groupMembersCol(guildId, groupId).get();
      await groupDoc(guildId, groupId).update({ memberCount: members.size }).catch(() => {});
    };

    // Deleção: apenas recalcula o contador
    if (!after) {
      await syncCount();
      return;
    }

    // Criação/atualização: valida invariantes
    try {
      const [guildSnap, groupSnap, memberSnap] = await Promise.all([
        guildDoc(guildId).get(),
        groupDoc(guildId, groupId).get(),
        groupMembersCol(guildId, groupId).doc(userId).get(),
      ]);

      const memberRef = groupMembersCol(guildId, groupId).doc(userId);
      let shouldRemove = false;

      if (!guildSnap.exists || !groupSnap.exists) {
        shouldRemove = true; // órfão (guild/grupo removidos)
      } else {
        const guild = guildSnap.data();
        const group = groupSnap.data();

        // 1. Pertencimento à guild
        if (!(guild.members ?? []).includes(userId)) shouldRemove = true;
        // 2. Capacidade (apenas na criação, evita remoção em updates de role/position)
        else if (!before) {
          const members = await groupMembersCol(guildId, groupId).get();
          if (members.size > (group.maxPlayers ?? Infinity)) shouldRemove = true;
        }
        // 3. Unicidade (apenas na criação)
        else if (!before) {
          const existing = await findMemberGroup(guildId, userId, groupId);
          if (existing) shouldRemove = true;
        }
      }

      if (shouldRemove) {
        console.warn(
          `[validateGuildGroupMember] removendo membro inválido ${userId} do grupo ${groupId} (guild ${guildId})`
        );
        await memberRef.delete().catch(() => {});
      }

      await syncCount();
    } catch (err) {
      console.error('[validateGuildGroupMember] falha na validação:', err.message);
      await syncCount().catch(() => {});
    }
  }
);

// Cleanup: remove membros órfãos quando o grupo é deletado
exports.cleanupGroupMembersOnDelete = onDocumentDeleted(
  'guilds/{guildId}/groups/{groupId}',
  async (event) => {
    const { guildId, groupId } = event.params;
    try {
      const members = await groupMembersCol(guildId, groupId).listDocuments();
      const ops = members.map((doc) => doc.delete());
      await Promise.all(ops);
    } catch (err) {
      console.error('[cleanupGroupMembersOnDelete]', err.message);
    }
  }
);

// Job agendado: reconcilia memberCount e remove membros duplicados/órfãos
exports.reconcileGuildGroups = onSchedule('every 15 minutes', async () => {
  const db = admin.firestore();
  const guilds = await db.collection('guilds').where('groupsEnabled', 'in', [true]).get().catch(() => null);
  // Fallback: varre guilds com grupos de qualquer forma via collectionGroup? Usa listagem simples.
  const all = guilds ?? (await db.collection('guilds').get());

  let fixed = 0;
  for (const g of all.docs) {
    const guildId = g.id;
    const guild = g.data();
    const memberIds = guild.members ?? [];

    const groups = await guildGroupsCol(guildId).get();
    for (const group of groups.docs) {
      // Separa órfãos (não estão na guild) e conta o total real
      const members = await groupMembersCol(guildId, group.id).get();
      let realCount = 0;
      for (const m of members.docs) {
        if (!memberIds.includes(m.id)) {
          await m.ref.delete();
          fixed++;
        } else {
          realCount++;
        }
      }

      const groupData = group.data();
      if (realCount !== (groupData.memberCount ?? 0)) {
        await group.ref.update({ memberCount: realCount });
        fixed++;
      }
    }
  }

  console.log(`[reconcileGuildGroups] concluído. Itens corrigidos: ${fixed}`);
});

// ============ CONQUISTAS ============
/* Criou uma guild: trigger em criação de guilda */
exports.achievementOnGuildCreated = onDocumentCreated('guilds/{guildId}', async (event) => {
  const data = event.data?.data();
  const ownerId = data?.ownerId;
  if (!ownerId) return;
  try {
    const ach = getAchievements();
    if (ach) await ach.awardAchievement(ownerId, 'common_created_guild');
  } catch {}
});

/* Entrou em uma guild: detecta via atualização do array members (joinGuild ou aceite de candidatura)
   Como join é feito via callable que já premia, aqui usamos trigger leve como fallback:
   quando guild ganha novo membro, premia quem entrou */
exports.achievementOnGuildMemberAdded = onDocumentWritten('guilds/{guildId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  const beforeMembers = new Set(before.members ?? []);
  const afterMembers = after.members ?? [];
  const newMembers = afterMembers.filter((id) => !beforeMembers.has(id));
  if (newMembers.length === 0) return;
  const ach = getAchievements();
  if (!ach) return;
  for (const charId of newMembers) {
    try {
      const charSnap = await admin.firestore().doc(`characters/${charId}`).get();
      if (!charSnap.exists) continue;
      const ownerId = charSnap.data()?.ownerId;
      if (ownerId) await ach.awardAchievement(ownerId, 'common_joined_guild');
    } catch {}
  }
});

/* Atualizou perfil: bio/displayName/socialLinks/photoURL/coverUrl */
exports.achievementOnProfileUpdated = onDocumentWritten('users/{userId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return; // criação tratada em createUserProfile
  const fields = ['displayName', 'bio', 'socialLinks', 'photoURL', 'coverUrl'];
  const changed = fields.some((f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null));
  if (!changed) return;
  try {
    const ach = getAchievements();
    if (ach) await ach.awardAchievement(event.params.userId, 'common_updated_profile');
  } catch {}
});

/* Comentou no perfil de alguém */
exports.achievementOnMuralComment = onDocumentCreated('users/{wallId}/mural/{postId}/comments/{commentId}', async (event) => {
  const data = event.data?.data();
  const authorId = data?.authorId;
  if (!authorId) return;
  try {
    const ach = getAchievements();
    if (ach) await ach.awardAchievement(authorId, 'common_commented_profile');
  } catch {}
});
/* Também conta post no mural como interação social fallback */
exports.achievementOnMuralPost = onDocumentCreated('users/{wallId}/mural/{postId}', async (event) => {
  // não premia post no próprio mural para evitar spam? premia author
  const data = event.data?.data();
  const authorId = data?.authorId;
  const wallId = event.params.wallId;
  if (!authorId || authorId === wallId) return;
  // considera como interação social também, mas usa mesma conquista de comentário para cobrir "Comentou no perfil"
  try {
    const ach = getAchievements();
    if (ach) await ach.awardAchievement(authorId, 'common_commented_profile');
  } catch {}
});

// Helpers para incrementar contadores (eventos, dkp, amigos, streams)
exports.grantEventAttendanceAchievement = async (uid) => {
  try {
    const ach = getAchievements();
    if (!ach) return;
    await ach.handleSingleTrigger(uid, 'event_attended'); // common_event_1
    await ach.incrementStatAndCheck(uid, 'event_attended');
  } catch (e) { console.error('[ach grantEvent]', e.message); }
};

// Wrap confirmAttendance para premiar após sucesso – monkey patch via trigger em confirmations
exports.achievementOnEventConfirmation = onDocumentCreated('guild_events/{eventId}/confirmations/{userId}', async (event) => {
  const uid = event.params.userId;
  try {
    const ach = getAchievements();
    if (!ach) return;
    await ach.handleSingleTrigger(uid, 'event_attended');
    await ach.incrementStatAndCheck(uid, 'event_attended');
  } catch (e) { console.error('[ach eventConfirmation]', e.message); }
});

// Stubs callable para DKP / amigos / streams (serão chamados pelo futuro sistema)
exports.recordDkpLoot = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
  const uid = context.auth.uid;
  const ach = getAchievements();
  if (!ach) return { success: true };
  await ach.handleSingleTrigger(uid, 'dkp_loot');
  await ach.incrementStatAndCheck(uid, 'dkp_loot');
  return { success: true };
});
exports.recordFriendAdded = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
  const uid = context.auth.uid;
  const ach = getAchievements();
  if (!ach) return { success: true };
  await ach.handleSingleTrigger(uid, 'friend_added');
  await ach.incrementStatAndCheck(uid, 'friend_added');
  return { success: true };
});
exports.recordLivestream = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
  const uid = context.auth.uid;
  const { platform } = data ?? {};
  // platform: twitch/kick/youtube – reservado para futura validação via API externa
  const ach = getAchievements();
  if (!ach) return { success: true, platform: platform ?? null };
  await ach.handleSingleTrigger(uid, 'livestream');
  await ach.incrementStatAndCheck(uid, 'livestream');
  return { success: true, platform: platform ?? null };
});
// Endpoint para consultar progresso (útil para debug e UI)
exports.getMyAchievements = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
  const uid = context.auth.uid;
  const [achSnap, statsSnap] = await Promise.all([
    admin.firestore().collection(`users/${uid}/achievements`).get(),
    admin.firestore().doc(`users/${uid}/stats/counters`).get(),
  ]);
  const unlocked = achSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const counters = statsSnap.exists ? statsSnap.data() : {};
  return { unlocked, counters };
});

// ============ ANÁLISES ============
Object.assign(exports, require('./analyses'));
