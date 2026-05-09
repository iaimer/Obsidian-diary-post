import Dexie, { Table } from 'dexie';
import { DiaryEntry } from '../types';

// 日记缓存数据库
class DiaryDatabase extends Dexie {
  entries!: Table<DiaryEntry, string>; // date as primary key

  constructor() {
    super('DiaryDB');
    this.version(1).stores({
      entries: 'date'
    });
  }
}

const db = new DiaryDatabase();

// 缓存日记
export async function cacheDiary(entry: DiaryEntry): Promise<void> {
  await db.entries.put(entry);
}

// 获取缓存的日记
export async function getCachedDiary(date: string): Promise<DiaryEntry | undefined> {
  return await db.entries.get(date);
}

// 获取所有缓存的日记
export async function getAllCachedDiaries(): Promise<DiaryEntry[]> {
  return await db.entries.toArray();
}

// 删除缓存
export async function deleteCachedDiary(date: string): Promise<void> {
  await db.entries.delete(date);
}

// 清空缓存
export async function clearCache(): Promise<void> {
  await db.entries.clear();
}

export { db };