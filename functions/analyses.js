const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const PRESIGNED_URL_EXPIRY = 15 * 60;
const MAX_VIDEO_SIZE_DEFAULT = 2 * 1024 * 1024 * 1024;
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const ALLOWED_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const VIDEO_RETENTION_DAYS = 7;

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(uid) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(uid) || [];
  const recentRequests = userRequests.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recentRequests.length >= RATE_LIMIT_MAX) return false;
  recentRequests.push(now);
  rateLimitStore.set(uid, recentRequests);
  return true;
}

class AnalysisError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const ERROR_HTTP_STATUS = {
  unauthenticated: 401, 'permission-denied': 403, 'not-found': 404,
  'invalid-argument': 400, 'already-exists': 409, 'resource-exhausted': 429,
  'failed-precondition': 400, internal: 500,
};

function callable(handler) {
  return onRequest({ cors: true }, async (req, res) => {
    try {
      const context = { rawRequest: req };
      const authorization = req.header('Authorization');
      if (authorization) {
        const match = authorization.match(/^Bearer (.*)$/i);
        if (!match) throw new AnalysisError('unauthenticated', 'Unauthenticated');
        try {
          const token = await admin.auth().verifyIdToken(match[1]);
          context.auth = { uid: token.uid, token };
        } catch { throw new AnalysisError('unauthenticated', 'Unauthenticated'); }
      }
      if (!context.auth) throw new AnalysisError('unauthenticated', 'User must be signed in');
      const data = req.body && req.body.data !== undefined ? req.body.data : undefined;
      const result = await handler(data, context);
      res.json({ result: result ?? null });
    } catch (err) {
      const code = err instanceof AnalysisError ? err.code : 'internal';
      const httpStatus = ERROR_HTTP_STATUS[code] ?? 500;
      res.status(httpStatus).json({ error: { status: code, message: err.message || 'Internal Error' } });
    }
  });
}

const db = () => admin.firestore();
const guildDoc = (guildId) => db().collection('guilds').doc(guildId);

async function requireGuildAuth(guildId, uid) {
  const snap = await guildDoc(guildId).get();
  if (!snap.exists) throw new AnalysisError('not-found', 'Guild not found');
  const guild = snap.data();
  if (guild.ownerId === uid) return { guild, isOwner: true };
  if (!(guild.memberOwnerIds || []).includes(uid)) throw new AnalysisError('permission-denied', 'Not a guild member');
  return { guild, isOwner: false };
}

async function requireGuildAdmin(guildId, uid) {
  const { guild, isOwner } = await requireGuildAuth(guildId, uid);
  if (isOwner) return guild;
  const memberRanks = guild.memberRanks || {};
  const charsSnap = await db().collection('characters').where('ownerId', '==', uid).where('guildId', '==', guildId).get();
  if (charsSnap.empty) throw new AnalysisError('permission-denied', 'No character in guild');
  const charId = charsSnap.docs[0].id;
  const rankId = memberRanks[charId];
  if (!rankId) throw new AnalysisError('permission-denied', 'No rank assigned');
  const rankSnap = await guildDoc(guildId).collection('ranks').doc(rankId).get();
  if (!rankSnap.exists) throw new AnalysisError('permission-denied', 'Rank not found');
  const rank = rankSnap.data();
  if (!rank.permissions || (!rank.permissions.manageEvents && !rank.permissions.manageMembers)) {
    throw new AnalysisError('permission-denied', 'Insufficient permissions');
  }
  return guild;
}

function generateObjectKey(guildId, requestId, userId, fileName) {
  const ext = fileName.split('.').pop() || 'mp4';
  return `guilds/${guildId}/analysis/${requestId}/${userId}/${crypto.randomUUID()}.${ext}`;
}

function validateVideoFile(fileName, contentType, fileSize, maxVideoSize) {
  if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
    throw new AnalysisError('invalid-argument', `Invalid video type: ${contentType}`);
  }
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AnalysisError('invalid-argument', `Invalid file extension: .${ext}`);
  }
  if (fileSize > maxVideoSize) throw new AnalysisError('invalid-argument', 'File size exceeds maximum');
  if (fileSize <= 0) throw new AnalysisError('invalid-argument', 'File size must be greater than 0');
}

exports.getAnalysisUploadUrl = callable(async (data, context) => {
  const { guildId, requestId, fileName, contentType, fileSize } = data || {};
  if (!guildId || !requestId || !fileName || !contentType || !fileSize) {
    throw new AnalysisError('invalid-argument', 'Missing required fields');
  }
  if (!checkRateLimit(context.auth.uid)) throw new AnalysisError('resource-exhausted', 'Rate limit exceeded');
  await requireGuildAuth(guildId, context.auth.uid);
  const requestSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new AnalysisError('not-found', 'Analysis request not found');
  const analysisRequest = requestSnap.data();
  if (analysisRequest.status !== 'open') throw new AnalysisError('failed-precondition', 'Request is not open');
  if (!analysisRequest.allowMultipleSubmissions) {
    const existing = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').where('userId', '==', context.auth.uid).get();
    if (!existing.empty) throw new AnalysisError('already-exists', 'Already submitted');
  }
  const maxVideoSize = analysisRequest.maxVideoSize || MAX_VIDEO_SIZE_DEFAULT;
  validateVideoFile(fileName, contentType, fileSize, maxVideoSize);
  const objectKey = generateObjectKey(guildId, requestId, context.auth.uid, fileName);
  const putCommand = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey, ContentType: contentType, ContentLength: fileSize });
  const presignedUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: PRESIGNED_URL_EXPIRY });
  const submissionRef = guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc();
  await submissionRef.set({
    userId: context.auth.uid, objectKey, originalFileName: fileName, contentType, fileSize,
    status: 'uploading', reviewStatus: 'pending',
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { presignedUrl, objectKey, submissionId: submissionRef.id, expiresInSeconds: PRESIGNED_URL_EXPIRY, useMultipart: fileSize >= MULTIPART_THRESHOLD };
});

exports.initMultipartUpload = callable(async (data, context) => {
  const { guildId, requestId, fileName, contentType, fileSize, partSize } = data || {};
  if (!guildId || !requestId || !fileName || !contentType || !fileSize) throw new AnalysisError('invalid-argument', 'Missing required fields');
  if (!checkRateLimit(context.auth.uid)) throw new AnalysisError('resource-exhausted', 'Rate limit exceeded');
  await requireGuildAuth(guildId, context.auth.uid);
  const requestSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new AnalysisError('not-found', 'Analysis request not found');
  const analysisRequest = requestSnap.data();
  if (analysisRequest.status !== 'open') throw new AnalysisError('failed-precondition', 'Request is not open');
  const maxVideoSize = analysisRequest.maxVideoSize || MAX_VIDEO_SIZE_DEFAULT;
  validateVideoFile(fileName, contentType, fileSize, maxVideoSize);
  const objectKey = generateObjectKey(guildId, requestId, context.auth.uid, fileName);
  const submissionRef = guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc();
  await submissionRef.set({
    userId: context.auth.uid, objectKey, originalFileName: fileName, contentType, fileSize,
    status: 'uploading', reviewStatus: 'pending',
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const calculatedPartSize = Math.max(partSize || 10 * 1024 * 1024, 5 * 1024 * 1024);
  const totalParts = Math.ceil(fileSize / calculatedPartSize);
  return { objectKey, submissionId: submissionRef.id, partSize: calculatedPartSize, totalParts, contentType };
});

exports.presignMultipartPart = callable(async (data, context) => {
  const { objectKey, partNumber, contentType } = data || {};
  if (!objectKey || !partNumber) throw new AnalysisError('invalid-argument', 'objectKey and partNumber required');
  if (!objectKey.startsWith('guilds/')) throw new AnalysisError('invalid-argument', 'Invalid object key');
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey, PartNumber: partNumber, ContentType: contentType || 'video/mp4' });
  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
  return { presignedUrl, partNumber };
});

exports.completeMultipartUpload = callable(async (data, context) => {
  const { guildId, requestId, submissionId, objectKey } = data || {};
  if (!guildId || !requestId || !submissionId || !objectKey) throw new AnalysisError('invalid-argument', 'Missing required fields');
  await requireGuildAuth(guildId, context.auth.uid);
  const submissionSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) throw new AnalysisError('not-found', 'Submission not found');
  const submission = submissionSnap.data();
  if (submission.userId !== context.auth.uid) throw new AnalysisError('permission-denied', 'Not your submission');
  const videoExpiresAt = new Date(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await submissionSnap.ref.update({
    status: 'uploaded',
    videoStatus: 'available',
    videoExpiresAt: admin.firestore.Timestamp.fromDate(videoExpiresAt),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true, objectKey };
});

exports.confirmAnalysisUpload = callable(async (data, context) => {
  const { guildId, requestId, submissionId, objectKey, fileName, fileSize, contentType } = data || {};
  if (!guildId || !requestId || !submissionId || !objectKey || !fileName || !fileSize || !contentType) {
    throw new AnalysisError('invalid-argument', 'Missing required fields');
  }
  await requireGuildAuth(guildId, context.auth.uid);
  const submissionSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) throw new AnalysisError('not-found', 'Submission not found');
  const submission = submissionSnap.data();
  if (submission.userId !== context.auth.uid) throw new AnalysisError('permission-denied', 'Not your submission');
  if (submission.objectKey !== objectKey) throw new AnalysisError('invalid-argument', 'Object key mismatch');
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
  } catch { throw new AnalysisError('not-found', 'Video not found in storage'); }
  const videoExpiresAt = new Date(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await submissionSnap.ref.update({
    status: 'uploaded', fileSize,
    videoStatus: 'available',
    videoExpiresAt: admin.firestore.Timestamp.fromDate(videoExpiresAt),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true, submissionId };
});

exports.getAnalysisPlayUrl = callable(async (data, context) => {
  const { guildId, requestId, submissionId } = data || {};
  if (!guildId || !requestId || !submissionId) throw new AnalysisError('invalid-argument', 'Missing required fields');
  await requireGuildAuth(guildId, context.auth.uid);
  const submissionSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) throw new AnalysisError('not-found', 'Submission not found');
  const submission = submissionSnap.data();
  if (submission.status !== 'uploaded' && submission.status !== 'reviewed') {
    throw new AnalysisError('failed-precondition', 'Video not ready');
  }
  const now = new Date();
  let expiresAt;
  if (submission.videoExpiresAt) {
    expiresAt = submission.videoExpiresAt.toDate ? submission.videoExpiresAt.toDate() : new Date(submission.videoExpiresAt);
  } else if (submission.uploadedAt) {
    const uploaded = submission.uploadedAt.toDate ? submission.uploadedAt.toDate() : new Date(submission.uploadedAt);
    expiresAt = new Date(uploaded.getTime() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }
  if (expiresAt && now >= expiresAt) {
    if (submission.videoStatus !== 'expired') {
      await submissionSnap.ref.update({ videoStatus: 'expired', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    return { expired: true };
  }
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: submission.objectKey });
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
    return { url: presignedUrl, contentType: submission.contentType, expired: false };
  } catch (err) {
    if (submission.videoStatus !== 'expired') {
      await submissionSnap.ref.update({ videoStatus: 'expired', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    return { expired: true, reason: 'video_not_found' };
  }
});

exports.createAnalysisRequest = callable(async (data, context) => {
  const { guildId, title, description, game, type, eventDate, deadline, maxVideoSize, allowMultipleSubmissions, targetMembers } = data || {};
  if (!guildId || !title || !game) throw new AnalysisError('invalid-argument', 'guildId, title, and game are required');
  await requireGuildAdmin(guildId, context.auth.uid);
  const requestData = {
    title, description: description || '', game, type: type || 'other',
    eventDate: eventDate || null, deadline: deadline || null,
    maxVideoSize: maxVideoSize || MAX_VIDEO_SIZE_DEFAULT,
    allowMultipleSubmissions: allowMultipleSubmissions || false,
    targetMembers: targetMembers || 'all',
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'open',
  };
  const ref = await guildDoc(guildId).collection('analysisRequests').add(requestData);
  return { success: true, requestId: ref.id };
});

exports.updateAnalysisRequest = callable(async (data, context) => {
  const { guildId, requestId, status } = data || {};
  if (!guildId || !requestId || !status) throw new AnalysisError('invalid-argument', 'Missing required fields');
  if (!['open', 'closed', 'archived'].includes(status)) throw new AnalysisError('invalid-argument', 'Invalid status');
  await requireGuildAdmin(guildId, context.auth.uid);
  const ref = guildDoc(guildId).collection('analysisRequests').doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new AnalysisError('not-found', 'Request not found');
  await ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { success: true };
});

exports.addAnalysisComment = callable(async (data, context) => {
  const { guildId, requestId, submissionId, timestamp, text } = data || {};
  if (!guildId || !requestId || !submissionId || timestamp === undefined || !text) {
    throw new AnalysisError('invalid-argument', 'Missing required fields');
  }
  const guild = await requireGuildAdmin(guildId, context.auth.uid);
  const submissionSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) throw new AnalysisError('not-found', 'Submission not found');
  const commentRef = guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).collection('comments').doc();
  await commentRef.set({
    userId: context.auth.uid, timestamp: Number(timestamp), text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true, commentId: commentRef.id };
});

exports.updateAnalysisComment = callable(async (data, context) => {
  const { guildId, requestId, submissionId, commentId, text } = data || {};
  if (!guildId || !requestId || !submissionId || !commentId || !text) {
    throw new AnalysisError('invalid-argument', 'Missing required fields');
  }
  await requireGuildAdmin(guildId, context.auth.uid);
  const commentRef = guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).collection('comments').doc(commentId);
  const snap = await commentRef.get();
  if (!snap.exists) throw new AnalysisError('not-found', 'Comment not found');
  if (snap.data().userId !== context.auth.uid) throw new AnalysisError('permission-denied', 'Not your comment');
  await commentRef.update({ text, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { success: true };
});

exports.deleteAnalysisComment = callable(async (data, context) => {
  const { guildId, requestId, submissionId, commentId } = data || {};
  if (!guildId || !requestId || !submissionId || !commentId) {
    throw new AnalysisError('invalid-argument', 'Missing required fields');
  }
  await requireGuildAdmin(guildId, context.auth.uid);
  const commentRef = guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).collection('comments').doc(commentId);
  const snap = await commentRef.get();
  if (!snap.exists) throw new AnalysisError('not-found', 'Comment not found');
  await commentRef.delete();
  return { success: true };
});

exports.saveAnalysisReview = callable(async (data, context) => {
  const { guildId, requestId, submissionId, scores, generalFeedback, strongPoints, improvementPoints, recommendation, overallScore } = data || {};
  if (!guildId || !requestId || !submissionId) throw new AnalysisError('invalid-argument', 'Missing required fields');
  const guild = await requireGuildAdmin(guildId, context.auth.uid);
  const submissionSnap = await guildDoc(guildId).collection('analysisRequests').doc(requestId).collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) throw new AnalysisError('not-found', 'Submission not found');
  await submissionSnap.ref.update({
    scores: scores || {}, generalFeedback: generalFeedback || '', strongPoints: strongPoints || '',
    improvementPoints: improvementPoints || '', recommendation: recommendation || '',
    overallScore: overallScore || null, reviewStatus: 'reviewed', reviewerId: context.auth.uid,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
});
