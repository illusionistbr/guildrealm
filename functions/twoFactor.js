const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');

// otplib config SHA256 6 digits 30s window 1
authenticator.options = { step: 30, window: 1, digits: 6, algorithm: 'sha256' };

const fv = admin.firestore.FieldValue;

const ISSUER = process.env.TOTP_ISSUER || 'ClanForge';

class CallableError extends Error { constructor(code, message){ super(message); this.code=code; } }
const CODE_TO_STATUS = { unauthenticated:'UNAUTHENTICATED', 'permission-denied':'PERMISSION_DENIED', 'not-found':'NOT_FOUND', 'already-exists':'ALREADY_EXISTS', 'invalid-argument':'INVALID_ARGUMENT', 'failed-precondition':'FAILED_PRECONDITION', 'resource-exhausted':'RESOURCE_EXHAUSTED' };
const STATUS_TO_HTTP = { UNAUTHENTICATED:401, PERMISSION_DENIED:403, NOT_FOUND:404, ALREADY_EXISTS:409, INVALID_ARGUMENT:400, FAILED_PRECONDITION:400, RESOURCE_EXHAUSTED:429, INTERNAL:500 };

function callable(handler){
  return onRequest({ cors:true }, async (req,res)=>{
    try{
      const ctx={ rawRequest:req };
      const authH=req.header('Authorization');
      if(authH){
        const m=authH.match(/^Bearer (.*)$/i);
        if(!m) throw new CallableError('unauthenticated','Unauthenticated');
        try{ const t=await admin.auth().verifyIdToken(m[1]); ctx.auth={ uid:t.uid, token:t, rawToken:m[1]}; } catch{ throw new CallableError('unauthenticated','Unauthenticated'); }
      }
      if(!ctx.auth) throw new CallableError('unauthenticated','User must be signed in');
      const data=req.body && req.body.data!==undefined ? req.body.data : undefined;
      const result=await handler(data,ctx);
      res.json({ result: result ?? null });
    }catch(err){
      const code=err instanceof CallableError ? err.code : 'internal';
      const status=CODE_TO_STATUS[code] ?? 'INTERNAL';
      const http=STATUS_TO_HTTP[status] ?? 500;
      res.status(http).json({ error:{ status, message: err.message || 'Internal Error' }});
    }
  });
}

function requireRecentAuth(ctx){
  const authTime = ctx.auth.token.auth_time; // seconds
  const nowSec = Math.floor(Date.now()/1000);
  if(!authTime || (nowSec - authTime) > 300){
    throw new CallableError('failed-precondition','Recent authentication required. Please re-authenticate.');
  }
}

let cachedKey=null;
function getEncryptionKey(){
  if(cachedKey) return cachedKey;
  let raw = process.env.TOTP_MASTER_KEY || process.env.TOTP_ENCRYPTION_KEY || '';
  if(!raw){
    console.warn('TOTP_MASTER_KEY not set, using dev fallback key (DO NOT USE IN PROD)');
    raw='dev-fallback-key-for-clanforge-2fa-32b';
  }
  // if hex 64 chars -> 32 bytes
  let key;
  if(/^[0-9a-fA-F]{64}$/.test(raw.trim())) key=Buffer.from(raw.trim(),'hex');
  else if(raw.length>=32){
    // hash to 32 bytes
    key=crypto.createHash('sha256').update(raw).digest();
  } else {
    key=crypto.createHash('sha256').update(raw).digest();
  }
  if(key.length!==32) key=crypto.createHash('sha256').update(key).digest();
  cachedKey=key;
  return key;
}

function encryptSecret(secret){
  const key=getEncryptionKey();
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc=Buffer.concat([cipher.update(secret,'utf8'), cipher.final()]);
  const authTag=cipher.getAuthTag();
  return { encryptedSecret: enc.toString('base64'), iv: iv.toString('base64'), authTag: authTag.toString('base64'), keyVersion:'v1' };
}
function decryptSecret(enc, ivB64, tagB64){
  const key=getEncryptionKey();
  const iv=Buffer.from(ivB64,'base64');
  const authTag=Buffer.from(tagB64,'base64');
  const decipher=crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const dec=Buffer.concat([decipher.update(Buffer.from(enc,'base64')), decipher.final()]);
  return dec.toString('utf8');
}

async function rateLimit(key, max, windowMs){
  const ref=admin.firestore().doc(`totp_attempts/${key}`);
  const now=Date.now();
  const snap=await ref.get();
  if(!snap.exists){ await ref.set({count:1, windowStart:now}); return; }
  const data=snap.data();
  const ws=data.windowStart ?? now;
  if(now-ws>windowMs){ await ref.set({count:1, windowStart:now}); return; }
  if((data.count??0)>=max) throw new CallableError('resource-exhausted','Too many attempts. Try later.');
  await ref.update({count: admin.firestore.FieldValue.increment(1)});
}

function generateRecoveryCodes(){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes=[];
  for(let i=0;i<10;i++){
    let s='';
    for(let j=0;j<12;j++) s+=alphabet[crypto.randomInt(alphabet.length)];
    const formatted=s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8,12);
    codes.push(formatted);
  }
  return codes;
}

function totpDoc(uid){ return admin.firestore().doc(`users/${uid}/security/totp`); }
function recoveryCol(uid){ return admin.firestore().collection(`users/${uid}/recoveryCodes`); }

// ============ STATUS ============
exports.getTwoFactorStatus = callable(async (data, ctx)=>{
  const snap=await totpDoc(ctx.auth.uid).get();
  if(!snap.exists) return { enabled:false };
  const d=snap.data();
  const recSnap=await recoveryCol(ctx.auth.uid).where('usedAt','==',null).limit(1).get();
  return { enabled: !!d.enabled, enabledAt: d.enabledAt ?? null, hasRecoveryCodes: !recSnap.empty, algorithm: d.algorithm ?? 'SHA256', period: d.period ?? 30, digits: d.digits ?? 6 };
});

// ============ START ENROLLMENT ============
exports.startTotpEnrollment = callable(async (data, ctx)=>{
  requireRecentAuth(ctx);
  await rateLimit(`enroll_${ctx.auth.uid}`, 3, 10*60*1000);
  const uid=ctx.auth.uid;
  const existing=await totpDoc(uid).get();
  if(existing.exists && existing.data().enabled) throw new CallableError('already-exists','2FA already enabled');
  // check pending enrollment
  const pending=await admin.firestore().collection('totpEnrollments').where('userId','==',uid).where('status','==','PENDING').limit(1).get();
  if(!pending.empty){
    const doc=pending.docs[0];
    const exp=doc.data().expiresAt?.toMillis ? doc.data().expiresAt.toMillis() : 0;
    if(exp > Date.now()){
      // reuse existing
      const d=doc.data();
      const uri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(ctx.auth.token.email || uid)}?secret=${d.plainSecretForQr}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA256&digits=6&period=30`;
      return { enrollmentId: doc.id, secret: d.plainSecretForQr, otpauthUrl: uri, expiresAt: d.expiresAt };
    }
  }
  const secret = authenticator.generateSecret(); // base32
  const enc=encryptSecret(secret);
  const enrollmentId=admin.firestore().collection('totpEnrollments').doc().id;
  const email=ctx.auth.token.email || uid;
  const otpauthUrl=`otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA256&digits=6&period=30`;
  const expiresAt=admin.firestore.Timestamp.fromMillis(Date.now()+10*60*1000);
  await admin.firestore().doc(`totpEnrollments/${enrollmentId}`).set({
    userId: uid,
    encryptedSecret: enc.encryptedSecret,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    plainSecretForQr: secret, // stored only until verified, then deleted; alternative to keep encrypted and decrypt for QR? For simplicity keep plain until verified but encrypted also; will delete after.
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    attempts:0,
    status:'PENDING',
  });
  // also store encrypted in enrollment, plain only for QR response, we will delete plain after verification
  return { enrollmentId, secret, otpauthUrl, expiresAt };
});

// ============ VERIFY ENROLLMENT ============
exports.verifyTotpEnrollment = callable(async (data, ctx)=>{
  const { enrollmentId, code } = data ?? {};
  if(!enrollmentId || !code) throw new CallableError('invalid-argument','enrollmentId and code required');
  await rateLimit(`verifyEnroll_${ctx.auth.uid}`, 5, 5*60*1000);
  const ref=admin.firestore().doc(`totpEnrollments/${enrollmentId}`);
  const snap=await ref.get();
  if(!snap.exists) throw new CallableError('not-found','Enrollment not found');
  const en=snap.data();
  if(en.userId !== ctx.auth.uid) throw new CallableError('permission-denied','Not your enrollment');
  if(en.status !== 'PENDING') throw new CallableError('failed-precondition','Enrollment already used');
  const exp=en.expiresAt?.toMillis ? en.expiresAt.toMillis() : 0;
  if(Date.now() > exp){ await ref.update({status:'EXPIRED'}); throw new CallableError('failed-precondition','Enrollment expired'); }
  if(en.attempts >=5){ await ref.update({status:'LOCKED'}); throw new CallableError('resource-exhausted','Too many attempts'); }
  await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
  // decrypt
  const secret = en.plainSecretForQr || decryptSecret(en.encryptedSecret, en.iv, en.authTag);
  const normalized=String(code).replace(/\s/g,'');
  if(!/^\d{6}$/.test(normalized)) throw new CallableError('invalid-argument','Code must be 6 digits');
  const isValid=authenticator.check(normalized, secret);
  if(!isValid) throw new CallableError('invalid-argument','Invalid code');
  // success: activate 2FA
  const enc=encryptSecret(secret);
  await totpDoc(ctx.auth.uid).set({
    enabled:true,
    algorithm:'SHA256',
    digits:6,
    period:30,
    encryptedSecret: enc.encryptedSecret,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    enabledAt: admin.firestore.FieldValue.serverTimestamp(),
    lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge:true});
  // generate recovery codes
  const codes=generateRecoveryCodes();
  const batch=admin.firestore().batch();
  // delete old codes
  const oldCodes=await recoveryCol(ctx.auth.uid).get();
  oldCodes.forEach(d=> batch.delete(d.ref));
  for(const c of codes){
    const hash=await bcrypt.hash(c.replace(/-/g,''), 10);
    const rref=recoveryCol(ctx.auth.uid).doc();
    batch.set(rref, { hash, usedAt:null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();
  // cleanup enrollment (remove plain secret)
  await ref.update({ status:'COMPLETED', plainSecretForQr: admin.firestore.FieldValue.delete(), completedAt: admin.firestore.FieldValue.serverTimestamp() });
  // audit
  try{ await admin.firestore().collection('users').doc(ctx.auth.uid).collection('activity').add({ type:'TOTP_ENABLED', createdAt: admin.firestore.FieldValue.serverTimestamp()}); }catch{}
  return { success:true, recoveryCodes: codes };
});

// ============ CREATE CHALLENGE (login) ============
exports.createTotpChallenge = callable(async (data, ctx)=>{
  const uid=ctx.auth.uid;
  const statusSnap=await totpDoc(uid).get();
  if(!statusSnap.exists || !statusSnap.data().enabled) throw new CallableError('failed-precondition','2FA not enabled');
  await rateLimit(`challenge_${uid}`, 5, 5*60*1000);
  const challengeId=admin.firestore().collection('authChallenges').doc().id;
  const expiresAt=admin.firestore.Timestamp.fromMillis(Date.now()+5*60*1000);
  await admin.firestore().doc(`authChallenges/${challengeId}`).set({
    userId: uid,
    type:'TOTP_LOGIN',
    status:'PENDING',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    attempts:0,
    maxAttempts:5,
  });
  return { challengeId, expiresAt };
});

// ============ VERIFY TOTP LOGIN ============
exports.verifyTotpLogin = callable(async (data, ctx)=>{
  const { challengeId, code } = data ?? {};
  if(!challengeId || !code) throw new CallableError('invalid-argument','challengeId and code required');
  const ref=admin.firestore().doc(`authChallenges/${challengeId}`);
  const snap=await ref.get();
  if(!snap.exists) throw new CallableError('not-found','Challenge not found');
  const ch=snap.data();
  if(ch.userId !== ctx.auth.uid) throw new CallableError('permission-denied','Not your challenge');
  if(ch.status !== 'PENDING') throw new CallableError('failed-precondition','Challenge already used');
  const exp=ch.expiresAt?.toMillis ? ch.expiresAt.toMillis() : 0;
  if(Date.now() > exp){ await ref.update({status:'EXPIRED'}); throw new CallableError('failed-precondition','Challenge expired'); }
  if((ch.attempts??0) >= (ch.maxAttempts ??5)){ await ref.update({status:'LOCKED'}); throw new CallableError('resource-exhausted','Too many attempts'); }
  await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });

  const totpSnap=await totpDoc(ctx.auth.uid).get();
  if(!totpSnap.exists || !totpSnap.data().enabled) throw new CallableError('failed-precondition','2FA not enabled');
  const totp=totpSnap.data();
  const secret=decryptSecret(totp.encryptedSecret, totp.iv, totp.authTag);
  const normalized=String(code).replace(/\s/g,'');
  if(!/^\d{6}$/.test(normalized)) throw new CallableError('invalid-argument','Code must be 6 digits');
  // replay protection: check if same code already used for this challenge in window? Store lastVerifiedAt and step
  const isValid=authenticator.check(normalized, secret);
  if(!isValid) throw new CallableError('invalid-argument','Invalid code');

  await ref.update({ status:'COMPLETED', completedAt: admin.firestore.FieldValue.serverTimestamp() });
  // mark verified for step-up: store session
  await admin.firestore().doc(`users/${ctx.auth.uid}/security/twoFactorSession`).set({
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    challengeId,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now()+ 30*60*1000), // 30 min session for login
  }, {merge:true});
  await totpDoc(ctx.auth.uid).update({ lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp() });
  try{ await admin.firestore().collection('users').doc(ctx.auth.uid).collection('activity').add({ type:'TOTP_LOGIN_SUCCESS', createdAt: admin.firestore.FieldValue.serverTimestamp()}); }catch{}
  return { success:true };
});

// ============ VERIFY RECOVERY CODE ============
exports.verifyRecoveryCode = callable(async (data, ctx)=>{
  const { challengeId, code } = data ?? {};
  if(!challengeId || !code) throw new CallableError('invalid-argument','challengeId and code required');
  const ref=admin.firestore().doc(`authChallenges/${challengeId}`);
  const snap=await ref.get();
  if(!snap.exists) throw new CallableError('not-found','Challenge not found');
  const ch=snap.data();
  if(ch.userId !== ctx.auth.uid) throw new CallableError('permission-denied','Not your challenge');
  if(ch.status !== 'PENDING') throw new CallableError('failed-precondition','Challenge already used');
  const exp=ch.expiresAt?.toMillis ? ch.expiresAt.toMillis() : 0;
  if(Date.now() > exp){ await ref.update({status:'EXPIRED'}); throw new CallableError('failed-precondition','Challenge expired'); }
  if((ch.attempts??0) >=5){ await ref.update({status:'LOCKED'}); throw new CallableError('resource-exhausted','Too many attempts'); }
  await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });

  const normalized=String(code).replace(/-/g,'').replace(/\s/g,'').toUpperCase();
  if(!normalized) throw new CallableError('invalid-argument','Recovery code required');
  const codesSnap=await recoveryCol(ctx.auth.uid).where('usedAt','==',null).get();
  let matched=null;
  for(const d of codesSnap.docs){
    const hash=d.data().hash;
    const ok=await bcrypt.compare(normalized, hash);
    if(ok){ matched=d; break; }
  }
  if(!matched) throw new CallableError('invalid-argument','Invalid recovery code');
  // mark used atomically
  await admin.firestore().runTransaction(async (tx)=>{
    const s=await tx.get(matched.ref);
    if(!s.exists || s.data().usedAt) throw new CallableError('invalid-argument','Recovery code already used');
    tx.update(matched.ref, { usedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(ref, { status:'COMPLETED', completedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await admin.firestore().doc(`users/${ctx.auth.uid}/security/twoFactorSession`).set({
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    challengeId,
    viaRecovery: true,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now()+ 30*60*1000),
  }, {merge:true});
  try{ await admin.firestore().collection('users').doc(ctx.auth.uid).collection('activity').add({ type:'RECOVERY_CODE_USED', createdAt: admin.firestore.FieldValue.serverTimestamp()}); }catch{}
  return { success:true };
});

// ============ DISABLE TOTP ============
exports.disableTotp = callable(async (data, ctx)=>{
  const { code, recoveryCode } = data ?? {};
  requireRecentAuth(ctx);
  const snap=await totpDoc(ctx.auth.uid).get();
  if(!snap.exists || !snap.data().enabled) throw new CallableError('failed-precondition','2FA not enabled');
  const totp=snap.data();
  const secret=decryptSecret(totp.encryptedSecret, totp.iv, totp.authTag);
  let valid=false;
  if(code){
    const norm=String(code).replace(/\s/g,'');
    if(/^\d{6}$/.test(norm) && authenticator.check(norm, secret)) valid=true;
  }
  if(!valid && recoveryCode){
    const norm=String(recoveryCode).replace(/-/g,'').replace(/\s/g,'').toUpperCase();
    const codesSnap=await recoveryCol(ctx.auth.uid).where('usedAt','==',null).get();
    for(const d of codesSnap.docs){
      if(await bcrypt.compare(norm, d.data().hash)){ valid=true; await d.ref.update({ usedAt: admin.firestore.FieldValue.serverTimestamp() }); break; }
    }
  }
  if(!valid) throw new CallableError('invalid-argument','Valid TOTP or recovery code required');
  await totpDoc(ctx.auth.uid).delete();
  const oldCodes=await recoveryCol(ctx.auth.uid).get();
  const batch=admin.firestore().batch();
  oldCodes.forEach(d=> batch.delete(d.ref));
  await batch.commit();
  try{ await admin.firestore().collection('users').doc(ctx.auth.uid).collection('activity').add({ type:'TOTP_DISABLED', createdAt: admin.firestore.FieldValue.serverTimestamp()}); }catch{}
  return { success:true };
});

// ============ REGENERATE RECOVERY CODES ============
exports.regenerateRecoveryCodes = callable(async (data, ctx)=>{
  const { code } = data ?? {};
  requireRecentAuth(ctx);
  const snap=await totpDoc(ctx.auth.uid).get();
  if(!snap.exists || !snap.data().enabled) throw new CallableError('failed-precondition','2FA not enabled');
  const totp=snap.data();
  const secret=decryptSecret(totp.encryptedSecret, totp.iv, totp.authTag);
  const norm=String(code||'').replace(/\s/g,'');
  if(!/^\d{6}$/.test(norm) || !authenticator.check(norm, secret)) throw new CallableError('invalid-argument','Valid TOTP code required');
  await rateLimit(`regen_${ctx.auth.uid}`, 3, 60*60*1000);
  const codes=generateRecoveryCodes();
  const batch=admin.firestore().batch();
  const old=await recoveryCol(ctx.auth.uid).get();
  old.forEach(d=> batch.delete(d.ref));
  for(const c of codes){
    const hash=await bcrypt.hash(c.replace(/-/g,''),10);
    const ref=recoveryCol(ctx.auth.uid).doc();
    batch.set(ref, { hash, usedAt:null, createdAt: admin.firestore.FieldValue.serverTimestamp()});
  }
  await batch.commit();
  return { recoveryCodes: codes };
});

// Cleanup expired enrollments/challenges hourly
exports.cleanupTotpExpired = onSchedule('every 60 minutes', async ()=>{
  const now=Date.now();
  const enroll=await admin.firestore().collection('totpEnrollments').where('expiresAt','<', admin.firestore.Timestamp.fromMillis(now)).where('status','==','PENDING').get();
  for(const d of enroll.docs){ await d.ref.update({status:'EXPIRED'}).catch(()=>{}); }
  const chall=await admin.firestore().collection('authChallenges').where('expiresAt','<', admin.firestore.Timestamp.fromMillis(now)).where('status','==','PENDING').get();
  for(const d of chall.docs){ await d.ref.update({status:'EXPIRED'}).catch(()=>{}); }
});
