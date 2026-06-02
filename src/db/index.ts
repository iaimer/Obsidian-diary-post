import Dexie, { Table } from 'dexie';
import { DiaryEntry } from '../types';

export type OutboxOperationType =
  | 'create_diary'
  | 'append_quick_note'
  | 'append_happiness'
  | 'append_reflection'
  | 'append_anxiety'
  | 'update_habits'
  | 'upload_image';

export interface OutboxOperation {
  id: string;
  type: OutboxOperationType;
  date: string;
  payload: Record<string, unknown>;
  imageBlob?: Blob;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

class DiaryDatabase extends Dexie {
  entries!: Table<DiaryEntry, string>;
  outbox!: Table<OutboxOperation, string>;

  constructor() {
    super('DiaryDB');
    this.version(2).stores({
      entries: 'date',
      outbox: 'id, type, date, status, createdAt'
    });
  }
}

const db = new DiaryDatabase();

export async function cacheDiary(entry: DiaryEntry): Promise<void> {
  await db.entries.put(entry);
}

export async function getCachedDiary(date: string): Promise<DiaryEntry | undefined> {
  return await db.entries.get(date);
}

export async function getAllCachedDiaries(): Promise<DiaryEntry[]> {
  return await db.entries.toArray();
}

export async function deleteCachedDiary(date: string): Promise<void> {
  await db.entries.delete(date);
}

export async function clearCache(): Promise<void> {
  await db.entries.clear();
}

export { db };