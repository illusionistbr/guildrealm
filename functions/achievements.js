const admin = require('firebase-admin');

const fv = admin.firestore.FieldValue;

// Definições replicadas no backend (mantém fonte única com lib/achievements/definitions.ts)
const DEFINITIONS = [
  { id: 'common_account_created', trigger: 'account_created', threshold: 1, xp: 50 },
  { id: 'common_joined_guild', trigger: 'joined_guild', threshold: 1, xp: 100 },
  { id: 'common_created_guild', trigger: 'created_guild', threshold: 1, xp: 150 },
  { id: 'common_updated_profile', trigger: 'updated_profile', threshold: 1, xp: 30 },
  { id: 'common_commented_profile', trigger: 'commented_profile', threshold: 1, xp: 30 },
  { id: 'common_event_1', trigger: 'event_attended', threshold: 1, xp: 80 },
  { id: 'common_dkp_loot_1', trigger: 'dkp_loot', threshold: 1, xp: 80 },
  { id: 'common_friend_1', trigger: 'friend_added', threshold: 1, xp: 30 },
  { id: 'common_stream_1', trigger: 'livestream', threshold: 1, xp: 100 },
  { id: 'rare_events_50', trigger: 'event_attended', threshold: 50, xp: 500 },
  { id: 'rare_dkp_50', trigger: 'dkp_loot', threshold: 50, xp: 500 },
  { id: 'rare_friends_50', trigger: 'friend_added', threshold: 50, xp: 500 },
  { id: 'rare_streams_50', trigger: 'livestream', threshold: 50, xp: 500 },
  { id: 'epic_events_200', trigger: 'event_attended', threshold: 200, xp: 2000 },
  { id: 'epic_dkp_200', trigger: 'dkp_loot', threshold: 200, xp: 2000 },
  { id: 'epic_friends_200', trigger: 'friend_added', threshold: 200, xp: 2000 },
  { id: 'epic_streams_200', trigger: 'livestream', threshold: 200, xp: 2000 },
];

const TRIGGER_TO_STAT = {
  event_attended: 'eventsAttended',
  dkp_loot: 'dkpLoots',
  friend_added: 'friendsAdded',
  livestream: 'livestreams',
};

async function awardAchievement(uid, achievementId) {
  if (!uid || !achievementId) return false;
  const achRef = admin.firestore().doc(`users/${uid}/achievements/${achievementId}`);
  const snap = await achRef.get();
  if (snap.exists) return false; // já desbloqueado
  const def = DEFINITIONS.find((d) => d.id === achievementId);
  if (!def) return false;
  await achRef.set({
    achievementId,
    unlockedAt: fv.serverTimestamp(),
    xpAwarded: def.xp,
  });
  // concede XP no perfil
  try {
    await admin.firestore().doc(`users/${uid}`).set(
      { xp: fv.increment(def.xp) },
      { merge: true },
    );
  } catch {}
  console.log(`[achievements] awarded ${achievementId} to ${uid} (+${def.xp} XP)`);
  return true;
}

async function incrementStatAndCheck(uid, trigger) {
  const statField = TRIGGER_TO_STAT[trigger];
  if (!statField) return;
  const userRef = admin.firestore().doc(`users/${uid}`);
  const statsRef = admin.firestore().doc(`users/${uid}/stats/counters`);
  // incrementa contador atômico
  await statsRef.set({ [statField]: fv.increment(1), updatedAt: fv.serverTimestamp() }, { merge: true });
  const snap = await statsRef.get();
  const count = snap.exists ? Number(snap.data()[statField] ?? 0) : 0;

  // verifica thresholds para esse trigger (1, 50, 200)
  const candidates = DEFINITIONS.filter((d) => d.trigger === trigger);
  for (const def of candidates) {
    if (count >= def.threshold) {
      await awardAchievement(uid, def.id);
    }
  }
  // mantém contador espelhado no doc do usuário para leitura rápida
  try {
    await userRef.set({ [statField]: count, updatedAt: fv.serverTimestamp() }, { merge: true });
  } catch {}
  return count;
}

async function handleSingleTrigger(uid, trigger) {
  const defs = DEFINITIONS.filter((d) => d.trigger === trigger && d.threshold === 1);
  for (const def of defs) {
    await awardAchievement(uid, def.id);
  }
}

module.exports = {
  DEFINITIONS,
  awardAchievement,
  incrementStatAndCheck,
  handleSingleTrigger,
  TRIGGER_TO_STAT,
};
