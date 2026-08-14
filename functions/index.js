const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
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
  'group-full': 'GROUP_FULL',
  'already-in-group': 'ALREADY_IN_GROUP',
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

// ============ ENTRADA/SAIDA DE GUILD (por personagem) ============

function characterDoc(characterId) {
  return admin.firestore().doc(`characters/${characterId}`);
}

// Alista um personagem em uma guild (o personagem passa a ser o "membro")
exports.joinGuild = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { characterId, guildId } = data ?? {};
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
    if (guild.recruitment === 'closed') {
      throw new CallableError('failed-precondition', 'Guild is not recruiting');
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

  await removeCharacterFromGuild(guildId, characterId);

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

  const guild = await requireGuildLeader(guildId, context.auth.uid);
  if (guild.ownerCharacterId === characterId) {
    throw new CallableError('failed-precondition', 'Guild leader cannot be removed');
  }
  if (!(guild.members ?? []).includes(characterId)) {
    throw new CallableError('invalid-argument', 'Character is not a guild member');
  }

  await removeCharacterFromGuild(guildId, characterId);

  return { success: true };
});

// Líder expulsa e bane um personagem da guild (não pode mais entrar)
exports.banGuildMember = callable(async (data, context) => {
  if (!context.auth) throw new CallableError('unauthenticated', 'User must be signed in');

  const { guildId, characterId } = data ?? {};
  if (!guildId || !characterId) {
    throw new CallableError('invalid-argument', 'guildId and characterId are required');
  }

  const guild = await requireGuildLeader(guildId, context.auth.uid);
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

async function requireGuildLeader(guildId, uid) {
  const snap = await guildDoc(guildId).get();
  if (!snap.exists) throw new CallableError('not-found', 'Guild not found');
  const guild = snap.data();
  if (guild.ownerId !== uid && !(guild.leaders ?? []).includes(uid)) {
    throw new CallableError('permission-denied', 'Only guild leaders can manage members');
  }
  return guild;
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

  const guild = await requireGuildLeader(guildId, context.auth.uid);
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

  await requireGuildLeader(guildId, context.auth.uid);

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
