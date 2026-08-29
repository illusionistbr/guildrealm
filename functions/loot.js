const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const crypto = require('crypto');

const fv = admin.firestore.FieldValue;

const LOOT_PERMISSIONS = {
  viewLoot: 'viewLoot',
  participateLoot: 'participateLoot',
  createLoot: 'createLoot',
  editLoot: 'editLoot',
  cancelLoot: 'cancelLoot',
  manageDkp: 'manageDkp',
  manageLootSettings: 'manageLootSettings',
};

const CODE_TO_STATUS = {
  unauthenticated: 'UNAUTHENTICATED',
  'permission-denied': 'PERMISSION_DENIED',
  'not-found': 'NOT_FOUND',
  'already-exists': 'ALREADY_EXISTS',
  'invalid-argument': 'INVALID_ARGUMENT',
  'failed-precondition': 'FAILED_PRECONDITION',
};

const STATUS_TO_HTTP = {
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  INVALID_ARGUMENT: 400,
  FAILED_PRECONDITION: 400,
  INTERNAL: 500,
};

class CallableError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function callable(handler) {
  return onRequest({ cors: true }, async (req, res) => {
    try {
      const context = { rawRequest: req };
      const authorization = req.header('Authorization');
      if (authorization) {
        const match = authorization.match(/^Bearer (.*)$/i);
        if (!match) throw new CallableError('unauthenticated', 'Unauthenticated');
        try {
          const token = await admin.auth().verifyIdToken(match[1]);
          context.auth = { uid: token.uid, token };
        } catch { throw new CallableError('unauthenticated', 'Unauthenticated'); }
      }
      if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');
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

function guildDoc(guildId) { return admin.firestore().doc(`guilds/${guildId}`); }
function lootDoc(guildId, lootId) { return admin.firestore().doc(`guilds/${guildId}/loot/${lootId}`); }
function lootCol(guildId) { return admin.firestore().collection(`guilds/${guildId}/loot`); }
function dkpBalanceDoc(guildId, characterId) { return admin.firestore().doc(`guilds/${guildId}/dkp_balances/${characterId}`); }
function dkpTxCol(guildId) { return admin.firestore().collection(`guilds/${guildId}/dkp_transactions`); }
function lootSettingsDoc(guildId) { return admin.firestore().doc(`guilds/${guildId}/settings/loot`); }
function characterDoc(characterId) { return admin.firestore().doc(`characters/${characterId}`); }

async function logGuildActivity(guildId, entry) {
  try {
    await admin.firestore().collection('guilds').doc(guildId).collection('activity').add({
      ...entry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) { console.error('logGuildActivity', e.message); }
}

async function createNotification(userId, guildId, payload) {
  try {
    await admin.firestore().collection('notifications').add({
      uid: userId,
      guildId,
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  } catch (e) { console.error('createNotification', e.message); }
}

async function getCallerCharacter(guildId, uid) {
  const snap = await admin.firestore().collection('characters').where('ownerId', '==', uid).where('guildId', '==', guildId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getCallerRank(guildId, guild, uid) {
  const chars = await admin.firestore().collection('characters').where('ownerId', '==', uid).where('guildId', '==', guildId).limit(1).get();
  if (chars.empty) return null;
  const charId = chars.docs[0].id;
  const rankId = guild.memberRanks?.[charId];
  if (!rankId) return null;
  const rankSnap = await guildDoc(guildId).collection('ranks').doc(rankId).get();
  if (!rankSnap.exists) return null;
  return rankSnap.data();
}

async function requireLootPermission(guildId, uid, permission) {
  const snap = await guildDoc(guildId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Guild not found');
  const guild = snap.data();
  if (guild.ownerId === uid || (guild.leaders ?? []).includes(uid)) return guild;
  const rank = await getCallerRank(guildId, guild, uid);
  if (rank && rank.permissions?.[permission]) return guild;
  // also allow legacy manageMembers/manageEvents for DKP/LOOT? strict for loot
  throw new CallableError('permission-denied', `Missing permission: ${permission}`);
}

async function requireGuildMember(guildId, uid) {
  const snap = await guildDoc(guildId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Guild not found');
  const guild = snap.data();
  if (guild.ownerId === uid) return guild;
  if ((guild.memberOwnerIds ?? []).includes(uid)) return guild;
  throw new CallableError('permission-denied', 'Not a guild member');
}

async function requireCharacterInGuild(guildId, characterId, uid) {
  const cSnap = await characterDoc(characterId).get();
  if (!cSnap.exists) throw new CallableError('not-found', 'Character not found');
  const c = cSnap.data();
  if (c.ownerId !== uid) throw new CallableError('permission-denied', 'Character does not belong to you');
  if (c.guildId !== guildId) throw new CallableError('invalid-argument', 'Character not in this guild');
  return c;
}

function validateLootPayload(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.type || !['AUCTION', 'RAFFLE'].includes(data.type)) throw new CallableError('invalid-argument', 'type must be AUCTION or RAFFLE');
    if (!data.item || typeof data.item.name !== 'string' || !data.item.name.trim()) throw new CallableError('invalid-argument', 'Item name required');
  }
  if (data.item && data.item.name && data.item.name.length > 120) throw new CallableError('invalid-argument', 'Item name too long');
  if (data.startsAt && data.endsAt) {
    const s = new Date(data.startsAt).getTime();
    const e = new Date(data.endsAt).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) throw new CallableError('invalid-argument', 'End must be after start');
  }
  if (data.type === 'AUCTION' || data.auction) {
    const a = data.auction ?? {};
    if (a.startingBid !== undefined && (typeof a.startingBid !== 'number' || a.startingBid < 0)) throw new CallableError('invalid-argument', 'Invalid startingBid');
    if (a.minimumIncrement !== undefined && (typeof a.minimumIncrement !== 'number' || a.minimumIncrement < 1)) throw new CallableError('invalid-argument', 'Invalid minimumIncrement');
  }
  if (data.type === 'RAFFLE' || data.raffle) {
    const r = data.raffle ?? {};
    if (r.entryCost !== undefined && (typeof r.entryCost !== 'number' || r.entryCost < 0)) throw new CallableError('invalid-argument', 'Invalid entryCost');
    if (r.maxTicketsPerUser !== undefined && (r.maxTicketsPerUser < 1 || r.maxTicketsPerUser > 100)) throw new CallableError('invalid-argument', 'Invalid maxTicketsPerUser');
  }
  if (data.eligibility) {
    if (!['ALL', 'CLASSES'].includes(data.eligibility.type)) throw new CallableError('invalid-argument', 'Invalid eligibility');
    if (data.eligibility.type === 'CLASSES' && (!Array.isArray(data.eligibility.allowedClasses) || data.eligibility.allowedClasses.length === 0)) {
      throw new CallableError('invalid-argument', 'Allowed classes required');
    }
  }
}

function computeNextProcessAt(now, decay) {
  const [h, m] = (decay.resetTime || '00:00').split(':').map(Number);
  const base = new Date(now);
  base.setUTCHours(h || 0, m || 0, 0, 0);
  if (decay.frequency === 'weekly') {
    const targetDow = decay.resetDay ?? 1; // 0 Sun
    const curDow = base.getUTCDay();
    let diff = targetDow - curDow;
    if (diff <= 0) diff += 7;
    // if today is target but time already passed today? Our base is today at resetTime, so diff 0 means today
    // But if we are exactly on target day and now >= base, next is next week
    if (targetDow === curDow && now >= base.getTime()) diff = 7;
    if (targetDow !== curDow) {
      // recompute from now's midnight
    }
    const next = new Date(base);
    next.setUTCDate(base.getUTCDate() + diff);
    return next;
  }
  if (decay.frequency === 'biweekly') {
    // next = lastProcessedAt + 14 days else now + 14 days aligned to resetDay/time
    if (decay.lastProcessedAt) {
      const last = decay.lastProcessedAt.toDate ? decay.lastProcessedAt.toDate() : new Date(decay.lastProcessedAt);
      const next = new Date(last);
      next.setUTCDate(next.getUTCDate() + 14);
      next.setUTCHours(h || 0, m || 0, 0, 0);
      if (next.getTime() <= now) {
        // catch up: add multiples of 14
        const diff = now - next.getTime();
        const add = Math.ceil(diff / (14 * 24 * 60 * 60 * 1000)) * 14;
        next.setUTCDate(next.getUTCDate() + add);
      }
      return next;
    }
    return computeNextProcessAt(now, { ...decay, frequency: 'weekly' });
  }
  if (decay.frequency === 'monthly') {
    const day = decay.resetDay ?? 1;
    const next = new Date(base);
    next.setUTCDate(day);
    next.setUTCHours(h || 0, m || 0, 0, 0);
    if (next.getTime() <= now) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next;
  }
  return new Date(now + 7 * 24 * 60 * 60 * 1000);
}

// Central DKP mutation (call inside transaction)
async function addDkpTx(tx, guildId, characterId, userId, amount, type, referenceType, referenceId, description, createdBy) {
  const balRef = dkpBalanceDoc(guildId, characterId);
  const balSnap = await tx.get(balRef);
  const before = balSnap.exists ? (balSnap.data().dkpBalance ?? 0) : 0;
  const after = before + amount;

  // allowNegative check (need loot settings)
  if (after < 0) {
    const settingsSnap = await tx.get(lootSettingsDoc(guildId));
    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    if (!settings || settings.allowNegativeDKP !== true) {
      throw new CallableError('failed-precondition', 'Insufficient DKP and negative balance not allowed');
    }
  }

  // idempotency for EVENT_REWARD: check existing tx
  if (type === 'EVENT_REWARD') {
    const existing = await tx.get(dkpTxCol(guildId).where('characterId', '==', characterId).where('referenceType', '==', referenceType).where('referenceId', '==', referenceId).limit(1));
    // Note: transaction get with where may not be allowed; fallback to query via admin outside tx? For now we query via tx.get with collection query
    // Firestore transaction supports query get
    if (!existing.empty) {
      // already credited
      return { before, after: before, txId: existing.docs[0].id, skipped: true };
    }
  }

  const txDoc = dkpTxCol(guildId).doc();
  tx.set(txDoc, {
    guildId,
    characterId,
    userId,
    amount,
    type,
    balanceBefore: before,
    balanceAfter: after,
    referenceType,
    referenceId,
    description: description.slice(0, 500),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy,
  });
  tx.set(balRef, {
    guildId,
    characterId,
    userId,
    dkpBalance: after,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { before, after, txId: txDoc.id, skipped: false };
}

// Helpers for non-transaction context (wrap in runTransaction)
async function addDkp(guildId, characterId, userId, amount, type, referenceType, referenceId, description, createdBy) {
  return admin.firestore().runTransaction(async (tx) => {
    return addDkpTx(tx, guildId, characterId, userId, amount, type, referenceType, referenceId, description, createdBy);
  });
}

// ==================== CALLABLES ====================

exports.saveLootSettings = callable(async (data, context) => {
  const { guildId, dkpEnabled, allowNegativeDKP, decay, antiSnipingDefault } = data ?? {};
  if (!guildId) throw new CallableError('invalid-argument', 'guildId required');
  await requireLootPermission(guildId, context.auth.uid, 'manageLootSettings');

  const payload = {};
  if (typeof dkpEnabled === 'boolean') payload.dkpEnabled = dkpEnabled;
  if (typeof allowNegativeDKP === 'boolean') payload.allowNegativeDKP = allowNegativeDKP;
  if (decay) {
    const d = {};
    if (typeof decay.enabled === 'boolean') d.enabled = decay.enabled;
    if (['weekly', 'biweekly', 'monthly'].includes(decay.frequency)) d.frequency = decay.frequency;
    if (typeof decay.percentage === 'number' && decay.percentage >= 0 && decay.percentage <= 100) d.percentage = decay.percentage;
    if (typeof decay.resetDay === 'number') d.resetDay = decay.resetDay;
    if (typeof decay.resetTime === 'string' && /^\d{2}:\d{2}$/.test(decay.resetTime)) d.resetTime = decay.resetTime;
    // compute nextProcessAt if enabling and not set
    if (d.enabled) {
      const now = Date.now();
      const currentSnap = await lootSettingsDoc(guildId).get();
      const current = currentSnap.exists ? currentSnap.data() : {};
      const merged = { ...(current.decay ?? {}), ...d };
      const next = computeNextProcessAt(now, merged);
      d.nextProcessAt = admin.firestore.Timestamp.fromDate(next);
      if (!current.decay?.lastProcessedAt) d.lastProcessedAt = null;
    }
    payload.decay = d;
  }
  if (antiSnipingDefault) {
    const a = {};
    if (typeof antiSnipingDefault.enabled === 'boolean') a.enabled = antiSnipingDefault.enabled;
    if (typeof antiSnipingDefault.thresholdSeconds === 'number') a.thresholdSeconds = Math.max(5, Math.min(600, antiSnipingDefault.thresholdSeconds));
    if (typeof antiSnipingDefault.extensionSeconds === 'number') a.extensionSeconds = Math.max(5, Math.min(600, antiSnipingDefault.extensionSeconds));
    payload.antiSnipingDefault = a;
  }
  payload.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  payload.updatedBy = context.auth.uid;

  await lootSettingsDoc(guildId).set(payload, { merge: true });
  await logGuildActivity(guildId, { type: 'loot_settings_updated', userId: context.auth.uid, details: payload });
  return { success: true };
});

exports.manageDkp = callable(async (data, context) => {
  const { guildId, characterId, amount, reason, operation } = data ?? {};
  if (!guildId || !characterId || typeof amount !== 'number' || !reason) {
    throw new CallableError('invalid-argument', 'guildId, characterId, amount, reason required');
  }
  if (!['add', 'remove'].includes(operation)) throw new CallableError('invalid-argument', 'operation must be add or remove');
  await requireLootPermission(guildId, context.auth.uid, 'manageDkp');
  const char = await requireCharacterInGuild(guildId, characterId, (await characterDoc(characterId).get()).data()?.ownerId || '');
  // actually char check should allow admin to manage any character, not necessarily own
  const cSnap = await characterDoc(characterId).get();
  if (!cSnap.exists) throw new CallableError('not-found', 'Character not found');
  const c = cSnap.data();
  if (c.guildId !== guildId) throw new CallableError('invalid-argument', 'Character not in guild');
  const userId = c.ownerId;
  const delta = operation === 'add' ? Math.abs(amount) : -Math.abs(amount);
  const type = operation === 'add' ? 'ADMIN_ADJUSTMENT' : 'MANUAL_REMOVE';
  // also support MANUAL_ADD
  const finalType = operation === 'add' ? 'MANUAL_ADD' : 'MANUAL_REMOVE';
  await addDkp(guildId, characterId, userId, delta, finalType, 'MANUAL', characterId, reason, context.auth.uid);
  await logGuildActivity(guildId, {
    type: operation === 'add' ? 'dkp_manual_add' : 'dkp_manual_remove',
    userId: context.auth.uid,
    characterId,
    characterName: c.name || c.nickname || characterId,
    details: { amount: delta, reason },
  });
  return { success: true };
});

exports.createLoot = callable(async (data, context) => {
  const { guildId, type, item, startsAt, endsAt, eligibility, auction, raffle } = data ?? {};
  if (!guildId) throw new CallableError('invalid-argument', 'guildId required');
  await requireLootPermission(guildId, context.auth.uid, 'createLoot');
  validateLootPayload({ type, item, startsAt, endsAt, eligibility, auction, raffle });

  const guildSnap = await guildDoc(guildId).get();
  const lootSettingsSnap = await lootSettingsDoc(guildId).get();
  const lootSettings = lootSettingsSnap.exists ? lootSettingsSnap.data() : null;
  if (lootSettings && lootSettings.dkpEnabled === false) {
    throw new CallableError('failed-precondition', 'DKP system disabled');
  }

  const now = admin.firestore.Timestamp.now();
  const s = startsAt ? admin.firestore.Timestamp.fromDate(new Date(startsAt)) : now;
  const e = admin.firestore.Timestamp.fromDate(new Date(endsAt));
  let status = 'SCHEDULED';
  if (s.toMillis() <= Date.now() && e.toMillis() > Date.now()) status = 'ACTIVE';
  else if (s.toMillis() > Date.now()) status = 'SCHEDULED';

  const docRef = lootCol(guildId).doc();
  const base = {
    guildId,
    type,
    item: {
      name: item.name.trim().slice(0, 120),
      image: typeof item.image === 'string' ? item.image.slice(0, 2000) : '',
      description: typeof item.description === 'string' ? item.description.slice(0, 2000) : '',
    },
    status,
    startsAt: s,
    endsAt: e,
    eligibility: eligibility ?? { type: 'ALL', allowedClasses: [] },
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (type === 'AUCTION') {
    const defAnti = lootSettings?.antiSnipingDefault ?? { enabled: true, thresholdSeconds: 60, extensionSeconds: 60 };
    base.auction = {
      startingBid: auction?.startingBid ?? 0,
      minimumIncrement: auction?.minimumIncrement ?? 10,
      currentBid: auction?.startingBid ?? 0,
      highestBidderId: null,
      bidCount: 0,
      antiSniping: {
        enabled: auction?.antiSniping?.enabled ?? defAnti.enabled,
        thresholdSeconds: auction?.antiSniping?.thresholdSeconds ?? defAnti.thresholdSeconds,
        extensionSeconds: auction?.antiSniping?.extensionSeconds ?? defAnti.extensionSeconds,
      },
      winnerId: null,
      winningBid: null,
      paymentProcessed: false,
    };
  } else {
    base.raffle = {
      entryCost: raffle?.entryCost ?? 50,
      allowMultipleTickets: raffle?.allowMultipleTickets ?? false,
      maxTicketsPerUser: raffle?.maxTicketsPerUser ?? 1,
      totalTickets: 0,
      winnerId: null,
      winningTicketNumber: null,
      drawProcessed: false,
    };
  }

  await docRef.set(base);
  await logGuildActivity(guildId, { type: type === 'AUCTION' ? 'loot_auction_created' : 'loot_raffle_created', userId: context.auth.uid, characterId: docRef.id, characterName: base.item.name, details: { lootId: docRef.id, type } });
  return { success: true, lootId: docRef.id };
});

exports.updateLoot = callable(async (data, context) => {
  const { guildId, lootId, ...updates } = data ?? {};
  if (!guildId || !lootId) throw new CallableError('invalid-argument', 'guildId and lootId required');
  await requireLootPermission(guildId, context.auth.uid, 'editLoot');
  const snap = await lootDoc(guildId, lootId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Loot not found');
  const loot = snap.data();
  if (['FINISHED', 'CANCELLED'].includes(loot.status)) throw new CallableError('failed-precondition', 'Cannot edit finished/cancelled loot');
  validateLootPayload(updates, true);
  const payload = { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: context.auth.uid };
  if (updates.item) {
    if (updates.item.name) payload['item.name'] = updates.item.name.trim().slice(0, 120);
    if (updates.item.image !== undefined) payload['item.image'] = String(updates.item.image).slice(0, 2000);
    if (updates.item.description !== undefined) payload['item.description'] = String(updates.item.description).slice(0, 2000);
  }
  if (updates.startsAt) payload.startsAt = admin.firestore.Timestamp.fromDate(new Date(updates.startsAt));
  if (updates.endsAt) payload.endsAt = admin.firestore.Timestamp.fromDate(new Date(updates.endsAt));
  if (updates.eligibility) payload.eligibility = updates.eligibility;
  if (updates.auction) {
    if (updates.auction.startingBid !== undefined) payload['auction.startingBid'] = updates.auction.startingBid;
    if (updates.auction.minimumIncrement !== undefined) payload['auction.minimumIncrement'] = updates.auction.minimumIncrement;
  }
  if (updates.raffle) {
    if (updates.raffle.entryCost !== undefined) payload['raffle.entryCost'] = updates.raffle.entryCost;
    if (updates.raffle.allowMultipleTickets !== undefined) payload['raffle.allowMultipleTickets'] = updates.raffle.allowMultipleTickets;
    if (updates.raffle.maxTicketsPerUser !== undefined) payload['raffle.maxTicketsPerUser'] = updates.raffle.maxTicketsPerUser;
  }
  await lootDoc(guildId, lootId).update(payload);
  return { success: true };
});

exports.cancelLoot = callable(async (data, context) => {
  const { guildId, lootId } = data ?? {};
  if (!guildId || !lootId) throw new CallableError('invalid-argument', 'guildId and lootId required');
  await requireLootPermission(guildId, context.auth.uid, 'cancelLoot');
  const snap = await lootDoc(guildId, lootId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Loot not found');
  const loot = snap.data();
  if (['FINISHED', 'CANCELLED'].includes(loot.status)) throw new CallableError('failed-precondition', 'Already finished/cancelled');
  await lootDoc(guildId, lootId).update({ status: 'CANCELLED', updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: context.auth.uid });
  await logGuildActivity(guildId, { type: 'loot_cancelled', userId: context.auth.uid, characterId: lootId, characterName: loot.item.name });
  return { success: true };
});

exports.placeBid = callable(async (data, context) => {
  const { guildId, lootId, characterId, amount } = data ?? {};
  if (!guildId || !lootId || !characterId || typeof amount !== 'number') throw new CallableError('invalid-argument', 'Missing fields');
  await requireGuildMember(guildId, context.auth.uid);
  await requireLootPermission(guildId, context.auth.uid, 'participateLoot').catch(async () => {
    // if view but not participate, deny
    await requireGuildMember(guildId, context.auth.uid);
    // fallback: check participate explicitly
    const snap = await guildDoc(guildId).get();
    const guild = snap.data();
    const rank = await getCallerRank(guildId, guild, context.auth.uid);
    // if no rank but owner, already passed; else need participateLoot
    if (!rank || !rank.permissions?.participateLoot) {
      // allow if no specific loot perms (legacy): allow all members to participate
      // To keep backward compat, allow if guild has no loot perms defined
      // For now throw
      throw new CallableError('permission-denied', 'Missing permission: participateLoot');
    }
  });
  const char = await requireCharacterInGuild(guildId, characterId, context.auth.uid);

  await admin.firestore().runTransaction(async (tx) => {
    const lootRef = lootDoc(guildId, lootId);
    const lootSnap = await tx.get(lootRef);
    if (!lootSnap.exists) throw new CallableError('not-found', 'Loot not found');
    const loot = lootSnap.data();
    if (loot.guildId !== guildId) throw new CallableError('invalid-argument', 'Guild mismatch');
    if (loot.type !== 'AUCTION') throw new CallableError('invalid-argument', 'Not an auction');
    if (loot.status !== 'ACTIVE') throw new CallableError('failed-precondition', 'Auction not active');
    const now = Date.now();
    const startsAt = loot.startsAt.toMillis();
    const endsAt = loot.endsAt.toMillis();
    if (now < startsAt) throw new CallableError('failed-precondition', 'Auction not started');
    if (now >= endsAt) throw new CallableError('failed-precondition', 'Auction ended');

    // eligibility
    if (loot.eligibility?.type === 'CLASSES') {
      const cls = char.className || char.class || '';
      if (!loot.eligibility.allowedClasses.includes(cls)) {
        throw new CallableError('permission-denied', 'Class not eligible');
      }
    }

    // bid validation
    const currentBid = loot.auction?.currentBid ?? loot.auction?.startingBid ?? 0;
    const minInc = loot.auction?.minimumIncrement ?? 10;
    const minRequired = currentBid === 0 ? loot.auction?.startingBid ?? 0 : currentBid + minInc;
    // For first bid, amount must be >= startingBid
    if (loot.auction?.bidCount === 0) {
      if (amount < (loot.auction?.startingBid ?? 0)) throw new CallableError('invalid-argument', `Bid must be at least ${loot.auction?.startingBid}`);
    } else {
      if (amount < minRequired) throw new CallableError('invalid-argument', `Next bid at least ${minRequired} DKP`);
    }
    if (amount <= currentBid) throw new CallableError('invalid-argument', 'Bid must be higher than current');

    // balance check (character's DKP)
    const balSnap = await tx.get(dkpBalanceDoc(guildId, characterId));
    const bal = balSnap.exists ? (balSnap.data().dkpBalance ?? 0) : 0;
    if (amount > bal) {
      const settingsSnap = await tx.get(lootSettingsDoc(guildId));
      const settings = settingsSnap.exists ? settingsSnap.data() : null;
      if (!settings || settings.allowNegativeDKP !== true) {
        throw new CallableError('failed-precondition', 'Insufficient DKP');
      }
    }

    // anti-sniping
    let newEndsAt = loot.endsAt;
    const anti = loot.auction?.antiSniping;
    if (anti?.enabled) {
      const remaining = endsAt - now;
      if (remaining <= anti.thresholdSeconds * 1000) {
        const extended = new Date(now + anti.extensionSeconds * 1000);
        newEndsAt = admin.firestore.Timestamp.fromDate(extended);
      }
    }

    // write bid
    const bidRef = lootRef.collection('bids').doc();
    tx.set(bidRef, {
      characterId,
      userId: context.auth.uid,
      amount,
      characterName: char.name || char.nickname || '',
      characterClass: char.className || char.class || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // update loot
    const update = {
      'auction.currentBid': amount,
      'auction.highestBidderId': characterId,
      'auction.bidCount': admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (newEndsAt !== loot.endsAt) {
      update.endsAt = newEndsAt;
    }
    tx.update(lootRef, update);
  });

  return { success: true };
});

exports.purchaseRaffleTickets = callable(async (data, context) => {
  const { guildId, lootId, characterId, quantity } = data ?? {};
  if (!guildId || !lootId || !characterId || typeof quantity !== 'number') throw new CallableError('invalid-argument', 'Missing fields');
  if (quantity < 1 || quantity > 100) throw new CallableError('invalid-argument', 'Invalid quantity');
  await requireGuildMember(guildId, context.auth.uid);
  const char = await requireCharacterInGuild(guildId, characterId, context.auth.uid);

  await admin.firestore().runTransaction(async (tx) => {
    const lootRef = lootDoc(guildId, lootId);
    const lootSnap = await tx.get(lootRef);
    if (!lootSnap.exists) throw new CallableError('not-found', 'Loot not found');
    const loot = lootSnap.data();
    if (loot.type !== 'RAFFLE') throw new CallableError('invalid-argument', 'Not a raffle');
    if (loot.status !== 'ACTIVE') throw new CallableError('failed-precondition', 'Raffle not active');
    const now = Date.now();
    if (now < loot.startsAt.toMillis() || now >= loot.endsAt.toMillis()) throw new CallableError('failed-precondition', 'Raffle not in active period');

    if (loot.eligibility?.type === 'CLASSES') {
      const cls = char.className || char.class || '';
      if (!loot.eligibility.allowedClasses.includes(cls)) throw new CallableError('permission-denied', 'Class not eligible');
    }

    const raffle = loot.raffle;
    if (!raffle.allowMultipleTickets && quantity > 1) throw new CallableError('invalid-argument', 'Multiple tickets not allowed');
    const participantRef = lootRef.collection('participants').doc(characterId);
    const participantSnap = await tx.get(participantRef);
    const existingCount = participantSnap.exists ? (participantSnap.data().ticketCount ?? 0) : 0;
    if (existingCount + quantity > raffle.maxTicketsPerUser) {
      const remaining = raffle.maxTicketsPerUser - existingCount;
      throw new CallableError('failed-precondition', `Você pode comprar apenas mais ${remaining} tickets.`);
    }

    const totalCost = raffle.entryCost * quantity;
    // balance check
    const balSnap = await tx.get(dkpBalanceDoc(guildId, characterId));
    const before = balSnap.exists ? (balSnap.data().dkpBalance ?? 0) : 0;
    if (before < totalCost) {
      const settingsSnap = await tx.get(lootSettingsDoc(guildId));
      const settings = settingsSnap.exists ? settingsSnap.data() : null;
      if (!settings || settings.allowNegativeDKP !== true) {
        throw new CallableError('failed-precondition', 'DKP insuficiente');
      }
    }
    const after = before - totalCost;

    // deduct DKP: create transaction
    const txId = dkpTxCol(guildId).doc().id;
    const txRef = dkpTxCol(guildId).doc(txId);
    tx.set(txRef, {
      guildId,
      characterId,
      userId: context.auth.uid,
      amount: -totalCost,
      type: 'RAFFLE_ENTRY',
      balanceBefore: before,
      balanceAfter: after,
      referenceType: 'LOOT',
      referenceId: lootId,
      description: `Compra de ${quantity} ticket(s) para ${loot.item.name}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
    });
    tx.set(dkpBalanceDoc(guildId, characterId), {
      guildId,
      characterId,
      userId: context.auth.uid,
      dkpBalance: after,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // generate tickets with atomic counter
    const counterRef = lootRef.collection('counter').doc('tickets');
    let counterSnap = await tx.get(counterRef);
    let current = 0;
    if (!counterSnap.exists) {
      // initialize from totalTickets
      current = loot.raffle.totalTickets ?? 0;
      tx.set(counterRef, { value: current });
      counterSnap = await tx.get(counterRef);
    } else {
      current = counterSnap.data().value ?? loot.raffle.totalTickets ?? 0;
    }
    const ticketNumbers = [];
    const ticketRefs = [];
    for (let i = 0; i < quantity; i++) {
      current += 1;
      const ticketNum = current;
      ticketNumbers.push(ticketNum);
      const tRef = lootRef.collection('tickets').doc();
      tx.set(tRef, {
        ticketNumber: ticketNum,
        characterId,
        userId: context.auth.uid,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        purchaseTxId: txId,
      });
    }
    tx.update(counterRef, { value: current });
    tx.update(lootRef, {
      'raffle.totalTickets': admin.firestore.FieldValue.increment(quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // participant agg
    if (participantSnap.exists) {
      tx.update(participantRef, {
        ticketCount: admin.firestore.FieldValue.increment(quantity),
        totalDkpSpent: admin.firestore.FieldValue.increment(totalCost),
        ticketNumbers: admin.firestore.FieldValue.arrayUnion(...ticketNumbers),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(participantRef, {
        characterId,
        userId: context.auth.uid,
        ticketCount: quantity,
        totalDkpSpent: totalCost,
        ticketNumbers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return { success: true };
});

// Scheduler: finalize auctions & raffles every minute
exports.finalizeLoots = onSchedule('every 1 minutes', async () => {
  const db = admin.firestore();
  const guildsSnap = await db.collection('guilds').get();
  const now = Date.now();
  for (const gDoc of guildsSnap.docs) {
    const guildId = gDoc.id;
    try {
      const lootSnap = await db.collection(`guilds/${guildId}/loot`).where('status', '==', 'ACTIVE').get();
      for (const lDoc of lootSnap.docs) {
        const loot = lDoc.data();
        const endsAt = loot.endsAt?.toMillis ? loot.endsAt.toMillis() : new Date(loot.endsAt).getTime();
        if (endsAt > now) continue;
        const lootId = lDoc.id;
        if (loot.type === 'AUCTION') {
          await finalizeAuction(guildId, lootId, loot);
        } else if (loot.type === 'RAFFLE') {
          await finalizeRaffle(guildId, lootId, loot);
        }
      }
    } catch (e) { console.error('finalizeLoots', guildId, e.message); }
  }
});

async function finalizeAuction(guildId, lootId, loot) {
  const lootRef = lootDoc(guildId, lootId);
  // idempotency: check already finished
  if (loot.status !== 'ACTIVE') return;
  if (loot.auction?.paymentProcessed) return;

  const winnerId = loot.auction?.highestBidderId || null;
  const winningBid = loot.auction?.currentBid ?? null;

  // if no bids
  if (!winnerId || !winningBid) {
    await lootRef.update({ status: 'FINISHED', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await logGuildActivity(guildId, { type: 'loot_auction_finished_no_bids', characterId: lootId, characterName: loot.item.name });
    return;
  }

  // need to charge winner
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(lootRef);
      const data = snap.data();
      if (!snap.exists || data.status !== 'ACTIVE') throw new Error('already');
      if (data.auction?.paymentProcessed) throw new Error('already');

      const charSnap = await tx.get(characterDoc(winnerId));
      if (!charSnap.exists) {
        tx.update(lootRef, { status: 'PENDING_RESOLUTION', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return;
      }
      const char = charSnap.data();
      const balRef = dkpBalanceDoc(guildId, winnerId);
      const balSnap = await tx.get(balRef);
      const before = balSnap.exists ? (balSnap.data().dkpBalance ?? 0) : 0;
      const after = before - winningBid;
      if (after < 0) {
        const settingsSnap = await tx.get(lootSettingsDoc(guildId));
        const settings = settingsSnap.exists ? settingsSnap.data() : null;
        if (!settings || settings.allowNegativeDKP !== true) {
          tx.update(lootRef, { status: 'PENDING_RESOLUTION', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          return;
        }
      }
      const txRef = dkpTxCol(guildId).doc();
      tx.set(txRef, {
        guildId,
        characterId: winnerId,
        userId: char.ownerId,
        amount: -winningBid,
        type: 'AUCTION_PAYMENT',
        balanceBefore: before,
        balanceAfter: after,
        referenceType: 'LOOT',
        referenceId: lootId,
        description: `Pagamento leilão ${loot.item.name}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'SYSTEM',
      });
      tx.set(balRef, { guildId, characterId: winnerId, userId: char.ownerId, dkpBalance: after, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.update(lootRef, {
        status: 'FINISHED',
        'auction.winnerId': winnerId,
        'auction.winningBid': winningBid,
        'auction.paymentProcessed': true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    // audit & notify
    const winCharSnap = await characterDoc(winnerId).get();
    const winChar = winCharSnap.exists ? winCharSnap.data() : null;
    await logGuildActivity(guildId, { type: 'loot_auction_finished', userId: winChar?.ownerId || 'SYSTEM', characterId: winnerId, characterName: winChar?.name || winnerId, details: { lootId, winningBid } });
    if (winChar?.ownerId) {
      await createNotification(winChar.ownerId, guildId, { type: 'AUCTION_WON', title: 'Você venceu o leilão!', body: `${loot.item.name} por ${winningBid} DKP` });
    }
    // notify outbid? Could fetch bidders but skip for now
  } catch (e) {
    if (e.message === 'already') return;
    console.error('finalizeAuction error', e.message);
    // set pending if failed due to balance
  }
}

async function finalizeRaffle(guildId, lootId, loot) {
  const lootRef = lootDoc(guildId, lootId);
  if (loot.status !== 'ACTIVE') return;
  if (loot.raffle?.drawProcessed) return;
  if (!loot.raffle || loot.raffle.totalTickets === 0) {
    await lootRef.update({ status: 'FINISHED', 'raffle.drawProcessed': true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await logGuildActivity(guildId, { type: 'loot_raffle_finished_no_tickets', characterId: lootId, characterName: loot.item.name });
    return;
  }
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(lootRef);
      const data = snap.data();
      if (!snap.exists || data.status !== 'ACTIVE') throw new Error('already');
      if (data.raffle?.drawProcessed) throw new Error('already');
      // pick random ticket
      const total = data.raffle.totalTickets;
      const randTicketNumber = crypto.randomInt(1, total + 1);
      // find ticket with that number
      const ticketsSnap = await tx.get(lootRef.collection('tickets').where('ticketNumber', '==', randTicketNumber).limit(1));
      let winnerId = null;
      if (!ticketsSnap.empty) {
        winnerId = ticketsSnap.docs[0].data().characterId;
      } else {
        // fallback: pick first ticket
        const anySnap = await tx.get(lootRef.collection('tickets').limit(1));
        if (!anySnap.empty) winnerId = anySnap.docs[0].data().characterId;
      }
      tx.update(lootRef, {
        status: 'FINISHED',
        'raffle.winnerId': winnerId,
        'raffle.winningTicketNumber': randTicketNumber,
        'raffle.drawProcessed': true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    const updated = await lootRef.get();
    const updData = updated.data();
    const winnerId = updData.raffle?.winnerId;
    if (winnerId) {
      const winCharSnap = await characterDoc(winnerId).get();
      const winChar = winCharSnap.exists ? winCharSnap.data() : null;
      await logGuildActivity(guildId, { type: 'loot_raffle_finished', userId: winChar?.ownerId || 'SYSTEM', characterId: winnerId, characterName: winChar?.name || winnerId, details: { lootId, winningTicketNumber: updData.raffle.winningTicketNumber } });
      if (winChar?.ownerId) {
        await createNotification(winChar.ownerId, guildId, { type: 'RAFFLE_WON', title: 'Você venceu o sorteio!', body: `${loot.item.name} ticket #${updData.raffle.winningTicketNumber}` });
      }
    }
  } catch (e) {
    if (e.message === 'already') return;
    console.error('finalizeRaffle', e.message);
  }
}

// Decay scheduler daily check (also every 1 hour to allow precise resetTime)
exports.processDkpDecay = onSchedule('every 60 minutes', async () => {
  const db = admin.firestore();
  const now = Date.now();
  const guildsSnap = await db.collection('guilds').get();
  for (const gDoc of guildsSnap.docs) {
    const guildId = gDoc.id;
    try {
      const settingsSnap = await db.doc(`guilds/${guildId}/settings/loot`).get();
      if (!settingsSnap.exists) continue;
      const settings = settingsSnap.data();
      if (!settings.decay?.enabled) continue;
      const nextAt = settings.decay.nextProcessAt?.toMillis ? settings.decay.nextProcessAt.toMillis() : null;
      if (nextAt == null || now < nextAt) continue;
      // check idempotency: if lastProcessedAt is same period, skip (nextAt ensures)
      await processDecayForGuild(guildId, settings);
    } catch (e) { console.error('processDkpDecay', guildId, e.message); }
  }
});

async function processDecayForGuild(guildId, settings) {
  const decay = settings.decay;
  const guildSnap = await guildDoc(guildId).get();
  const guild = guildSnap.data();
  const members = guild?.members ?? []; // characterIds
  if (members.length === 0) {
    // update nextProcessAt even if no members
    const next = computeNextProcessAt(Date.now(), decay);
    await lootSettingsDoc(guildId).set({ decay: { ...decay, lastProcessedAt: admin.firestore.Timestamp.now(), nextProcessAt: admin.firestore.Timestamp.fromDate(next) } }, { merge: true });
    return;
  }
  const percentage = decay.percentage ?? 15;
  for (const characterId of members) {
    try {
      await admin.firestore().runTransaction(async (tx) => {
        const balRef = dkpBalanceDoc(guildId, characterId);
        const balSnap = await tx.get(balRef);
        if (!balSnap.exists) return;
        const data = balSnap.data();
        const before = data.dkpBalance ?? 0;
        if (before <= 0) return;
        const decayAmount = Math.floor(before * (percentage / 100));
        if (decayAmount <= 0) return;
        const after = before - decayAmount;
        // allowNegative already handled but decay never goes negative below 0? keep at 0
        const finalAfter = Math.max(0, after);
        const actualDecay = before - finalAfter;
        if (actualDecay <= 0) return;
        const txRef = dkpTxCol(guildId).doc();
        tx.set(txRef, {
          guildId,
          characterId,
          userId: data.userId,
          amount: -actualDecay,
          type: 'DECAY',
          balanceBefore: before,
          balanceAfter: finalAfter,
          referenceType: 'SYSTEM',
          referenceId: `decay_${Date.now()}`,
          description: `Decaimento ${decay.frequency} de ${percentage}%`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'SYSTEM',
        });
        tx.set(balRef, { dkpBalance: finalAfter, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
    } catch (e) { console.error('decay char', characterId, e.message); }
  }
  const next = computeNextProcessAt(Date.now(), decay);
  await lootSettingsDoc(guildId).set({ decay: { ...decay, lastProcessedAt: admin.firestore.Timestamp.now(), nextProcessAt: admin.firestore.Timestamp.fromDate(next) } }, { merge: true });
  await logGuildActivity(guildId, { type: 'dkp_decay', userId: 'SYSTEM', details: { percentage, frequency: decay.frequency } });
}

// Trigger: on attendance confirmation, award DKP per character
exports.awardDkpOnAttendance = onDocumentCreated('guild_events/{eventId}/confirmations/{userId}', async (event) => {
  const { eventId, userId } = event.params;
  try {
    const confirmSnap = event.data;
    if (!confirmSnap) return;
    const eventSnap = await admin.firestore().doc(`guild_events/${eventId}`).get();
    if (!eventSnap.exists) return;
    const ev = eventSnap.data();
    const guildId = ev.guildId;
    if (!guildId) return;
    const dkpReward = ev.dkpReward ?? ev.dkp ?? 0;
    if (!dkpReward || dkpReward <= 0) return;
    const settingsSnap = await lootSettingsDoc(guildId).get();
    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    if (settings && settings.dkpEnabled === false) return;

    // find characters of user in this guild
    const charsSnap = await admin.firestore().collection('characters').where('ownerId', '==', userId).where('guildId', '==', guildId).get();
    if (charsSnap.empty) return;
    // For per-character DKP, reward only the first character (or all? spec says never double; we reward first)
    // If multiple chars, reward each? Spec says member should not get twice per event per character? We'll reward each character that confirmed? But confirmation is per userId, not per character. So reward one.
    const charDocSnap = charsSnap.docs[0];
    const characterId = charDocSnap.id;
    const char = charDocSnap.data();

    // idempotency: check existing tx
    const existing = await admin.firestore().collection(`guilds/${guildId}/dkp_transactions`).where('characterId', '==', characterId).where('referenceType', '==', 'EVENT').where('referenceId', '==', eventId).limit(1).get();
    if (!existing.empty) return;

    await addDkp(guildId, characterId, userId, dkpReward, 'EVENT_REWARD', 'EVENT', eventId, `Participação no evento ${ev.title || eventId}`, 'SYSTEM');
    await logGuildActivity(guildId, { type: 'dkp_event_reward', userId, characterId, characterName: char.name || char.nickname || userId, details: { eventId, dkpReward } });
    await createNotification(userId, guildId, { type: 'DKP_RECEIVED', title: `+${dkpReward} DKP`, body: `Participação no evento ${ev.title || ''}` });
  } catch (e) { console.error('awardDkpOnAttendance', e.message); }
});

exports.getMyDkpHistory = callable(async (data, context) => {
  const { guildId, characterId, limit = 50 } = data ?? {};
  if (!guildId) throw new CallableError('invalid-argument', 'guildId required');
  await requireGuildMember(guildId, context.auth.uid);
  let q = dkpTxCol(guildId).orderBy('createdAt', 'desc').limit(Math.min(limit, 100));
  if (characterId) {
    q = dkpTxCol(guildId).where('characterId', '==', characterId).orderBy('createdAt', 'desc').limit(Math.min(limit, 100));
  }
  const snap = await q.get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { transactions: list };
});
