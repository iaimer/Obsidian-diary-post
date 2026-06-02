import { db, OutboxOperation, OutboxOperationType } from '../db';
import { useDiaryStore } from '../stores/diaryStore';
import { blobToBase64 } from './imageService';

let syncLock = false;
const OUTBOX_CHANGE_EVENT = 'diary-outbox-change';
const OUTBOX_SYNCED_EVENT = 'diary-outbox-synced';

function emit(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

function getApi(): { url: string; token: string } {
  const { apiUrl, apiToken } = useDiaryStore.getState();
  const cleanUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
  return { url: cleanUrl, token: apiToken };
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const { url, token } = getApi();
  const response = await fetch(`${url}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API ${response.status}`);
  }
  return response;
}

async function uploadImageAPI(imageBlob: Blob, operationId: string, date: string): Promise<Response> {
  const { url, token } = getApi();
  const base64 = await blobToBase64(imageBlob);
  const response = await fetch(`${url}/api/v1/diary/image/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, imageData: base64, operationId })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API ${response.status}`);
  }
  return response;
}

async function sendOperation(op: OutboxOperation): Promise<void> {
  if (op.type !== 'create_diary') {
    await fetchAPI('/api/v1/diary/create', {
      method: 'POST',
      body: JSON.stringify({ date: op.date })
    });
  }

  switch (op.type) {
    case 'create_diary':
      await fetchAPI('/api/v1/diary/create', {
        method: 'POST',
        body: JSON.stringify({ date: op.date, operationId: op.id })
      });
      break;
    case 'append_quick_note':
      await fetchAPI('/api/v1/diary/quick-note', {
        method: 'POST',
        body: JSON.stringify({ ...op.payload, date: op.date, operationId: op.id })
      });
      break;
    case 'append_happiness':
      await fetchAPI('/api/v1/diary/happiness', {
        method: 'POST',
        body: JSON.stringify({ ...op.payload, date: op.date, operationId: op.id })
      });
      break;
    case 'append_reflection':
      await fetchAPI('/api/v1/diary/reflection', {
        method: 'POST',
        body: JSON.stringify({ ...op.payload, date: op.date, operationId: op.id })
      });
      break;
    case 'append_anxiety':
      await fetchAPI('/api/v1/diary/anxiety', {
        method: 'POST',
        body: JSON.stringify({ ...op.payload, date: op.date, operationId: op.id })
      });
      break;
    case 'update_habits':
      await fetchAPI('/api/v1/diary/habit', {
        method: 'POST',
        body: JSON.stringify({ ...op.payload, date: op.date, operationId: op.id })
      });
      break;
    case 'upload_image':
      if (!op.imageBlob) throw new Error('图片数据缺失');
      await uploadImageAPI(op.imageBlob, op.id, op.date);
      break;
  }
}

export async function enqueue(
  type: OutboxOperationType,
  date: string,
  payload: Record<string, unknown>,
  imageBlob?: Blob
): Promise<string> {
  const id = crypto.randomUUID();
  const op: OutboxOperation = {
    id,
    type,
    date,
    payload,
    imageBlob,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  };

  if (type === 'update_habits') {
    const existing = await db.outbox.where({ type: 'update_habits', date }).toArray();
    for (const old of existing) {
      if (old.id !== id) {
        await db.outbox.delete(old.id);
      }
    }
  }

  await db.outbox.put(op);
  emit(OUTBOX_CHANGE_EVENT);
  syncPending();
  return id;
}

export async function syncPending(): Promise<void> {
  if (syncLock) return;
  syncLock = true;

  try {
    const { url, token } = getApi();
    if (!url || !token) return;

    await db.outbox.where('status').equals('syncing').modify({ status: 'pending' });
    const processed = new Set<string>();

    while (true) {
      const pending = (await db.outbox
        .where('status')
        .equals('pending')
        .sortBy('createdAt'))
        .filter(op => !processed.has(op.id));
      if (pending.length === 0) break;

      for (const op of pending) {
        processed.add(op.id);
        try {
          await db.outbox.update(op.id, { status: 'syncing' });
          emit(OUTBOX_CHANGE_EVENT);
          await sendOperation(op);
          await db.outbox.delete(op.id);
          emit(OUTBOX_SYNCED_EVENT);
        } catch (err) {
          const retryCount = (op.retryCount || 0) + 1;
          const lastError = err instanceof Error ? err.message : String(err);
          await db.outbox.update(op.id, {
            status: retryCount >= 5 ? 'failed' : 'pending',
            retryCount,
            lastError
          });
        }
      }
    }
  } finally {
    syncLock = false;
    emit(OUTBOX_CHANGE_EVENT);
  }
}

export async function retryFailed(): Promise<void> {
  const failed = await db.outbox.where('status').equals('failed').toArray();
  for (const op of failed) {
    await db.outbox.update(op.id, { status: 'pending', retryCount: 0, lastError: undefined });
  }
  emit(OUTBOX_CHANGE_EVENT);
  syncPending();
}

export async function getOutboxSummary(): Promise<{
  pending: number;
  failed: number;
  syncing: boolean;
}> {
  const all = await db.outbox.toArray();
  return {
    pending: all.filter(o => o.status !== 'failed').length,
    failed: all.filter(o => o.status === 'failed').length,
    syncing: syncLock
  };
}

export async function isOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { url, token } = getApi();
    if (!url || !token) return false;
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
