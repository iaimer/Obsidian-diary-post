import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import config from '../config/index.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

export function getDiaryPath(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = getDateString(date);
  
  return join(
    config.vaultPath,
    'workspace',
    '生活',
    '日记',
    year.toString(),
    `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`,
    `${day}.md`
  );
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function readDiary(date: Date): string {
  const path = getDiaryPath(date);
  if (!existsSync(path)) {
    throw new Error(`Diary not found: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}

export function writeDiary(date: Date, content: string): void {
  const path = getDiaryPath(date);
  const dir = join(path, '..');
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, content, 'utf-8');
}

export function listMonthDiaries(year: number, month: number): string[] {
  const dir = join(
    config.vaultPath,
    'workspace',
    '生活',
    '日记',
    year.toString(),
    `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`
  );
  
  if (!existsSync(dir)) {
    return [];
  }
  
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

export function existsDiary(date: Date): boolean {
  const path = getDiaryPath(date);
  return existsSync(path);
}