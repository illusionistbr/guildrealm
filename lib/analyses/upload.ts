import { getUploadUrl, initMultipartUpload, presignMultipartPart, confirmMultipartUpload, confirmUpload } from './hooks';

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

export interface UploadProgress {
  stage: 'selecting' | 'validating' | 'preparing' | 'uploading' | 'confirming' | 'complete' | 'error';
  progress: number;
  loaded: number;
  total: number;
  speed: number;
  estimatedTimeRemaining: number;
  error?: string;
}

export interface UploadCallbacks {
  onProgress: (progress: UploadProgress) => void;
  onComplete: (submissionId: string) => void;
  onError: (error: string) => void;
}

function getVideoExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'mp4';
}

function validateFile(file: File, maxSize: number): string | null {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];

  const ext = getVideoExtension(file.name);
  if (!allowedExtensions.includes(ext)) {
    return `Formato não suportado: .${ext}. Use: ${allowedExtensions.join(', ')}`;
  }
  if (!allowedTypes.includes(file.type) && file.type !== '') {
    return `Tipo de arquivo não suportado: ${file.type}`;
  }
  if (file.size > maxSize) {
    return `Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  if (file.size <= 0) {
    return 'Arquivo vazio';
  }
  return null;
}

async function uploadSmallFile(
  presignedUrl: string,
  file: File,
  contentType: string,
  callbacks: UploadCallbacks
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = event.loaded / elapsed;
        const remaining = (event.total - event.loaded) / speed;

        callbacks.onProgress({
          stage: 'uploading',
          progress,
          loaded: event.loaded,
          total: event.total,
          speed,
          estimatedTimeRemaining: remaining,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        callbacks.onProgress({
          stage: 'confirming',
          progress: 100,
          loaded: file.size,
          total: file.size,
          speed: 0,
          estimatedTimeRemaining: 0,
        });
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

async function uploadMultipart(
  file: File,
  contentType: string,
  objectKey: string,
  guildId: string,
  requestId: string,
  submissionId: string,
  callbacks: UploadCallbacks
): Promise<void> {
  const partSize = 10 * 1024 * 1024; // 10MB per part
  const totalParts = Math.ceil(file.size / partSize);
  const uploadedParts: { PartNumber: number; ETag: string }[] = [];
  const startTime = Date.now();
  let totalLoaded = 0;

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    let retries = 3;
    while (retries > 0) {
      try {
        const { presignedUrl } = await presignMultipartPart({
          objectKey,
          partNumber,
          contentType,
        });

        const response = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          headers: { 'Content-Type': contentType },
        });

        if (!response.ok) throw new Error(`Part ${partNumber} failed`);

        const etag = response.headers.get('ETag');
        if (etag) {
          uploadedParts.push({ PartNumber: partNumber, ETag: etag.replace(/"/g, '') });
        }

        totalLoaded += chunk.size;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = totalLoaded / elapsed;
        const remaining = (file.size - totalLoaded) / speed;

        callbacks.onProgress({
          stage: 'uploading',
          progress: (totalLoaded / file.size) * 100,
          loaded: totalLoaded,
          total: file.size,
          speed,
          estimatedTimeRemaining: remaining,
        });

        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        callbacks.onProgress({
          stage: 'uploading',
          progress: (totalLoaded / file.size) * 100,
          loaded: totalLoaded,
          total: file.size,
          speed: 0,
          estimatedTimeRemaining: 0,
          error: `Reconectando... (${3 - retries}/3)`,
        });
        await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
      }
    }
  }

  await confirmMultipartUpload({
    guildId,
    requestId,
    submissionId,
    objectKey,
  });
}

export async function uploadVideo(
  file: File,
  guildId: string,
  requestId: string,
  maxSize: number,
  callbacks: UploadCallbacks
): Promise<string> {
  // Stage 1: Validating
  callbacks.onProgress({
    stage: 'validating',
    progress: 0,
    loaded: 0,
    total: file.size,
    speed: 0,
    estimatedTimeRemaining: 0,
  });

  const validationError = validateFile(file, maxSize);
  if (validationError) {
    callbacks.onError(validationError);
    throw new Error(validationError);
  }

  // Stage 2: Preparing
  callbacks.onProgress({
    stage: 'preparing',
    progress: 0,
    loaded: 0,
    total: file.size,
    speed: 0,
    estimatedTimeRemaining: 0,
  });

  const contentType = file.type || 'video/mp4';
  const useMultipart = file.size >= MULTIPART_THRESHOLD;

  let submissionId: string;
  let objectKey: string;

  if (useMultipart) {
    const result = await initMultipartUpload({
      guildId,
      requestId,
      fileName: file.name,
      contentType,
      fileSize: file.size,
    });
    submissionId = result.submissionId;
    objectKey = result.objectKey;

    // Upload multipart
    await uploadMultipart(file, contentType, objectKey, guildId, requestId, submissionId, callbacks);
  } else {
    const result = await getUploadUrl({
      guildId,
      requestId,
      fileName: file.name,
      contentType,
      fileSize: file.size,
    });
    submissionId = result.submissionId;
    objectKey = result.objectKey;

    // Upload small file
    await uploadSmallFile(result.presignedUrl, file, contentType, callbacks);
  }

  // Stage 3: Confirming
  callbacks.onProgress({
    stage: 'confirming',
    progress: 100,
    loaded: file.size,
    total: file.size,
    speed: 0,
    estimatedTimeRemaining: 0,
  });

  await confirmUpload({
    guildId,
    requestId,
    submissionId,
    objectKey,
    fileName: file.name,
    fileSize: file.size,
    contentType,
  });

  // Stage 4: Complete
  callbacks.onProgress({
    stage: 'complete',
    progress: 100,
    loaded: file.size,
    total: file.size,
    speed: 0,
    estimatedTimeRemaining: 0,
  });

  callbacks.onComplete(submissionId);
  return submissionId;
}
