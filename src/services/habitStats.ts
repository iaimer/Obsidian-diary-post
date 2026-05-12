// 习惯统计数据服务

import { HabitData, DiaryEntry } from '../types';
import { getAllCachedDiaries, cacheDiary } from '../db';
import { getFileSyncService } from './fileSync';
import { parseDiary } from '../utils/markdown';
import { getDateString } from '../utils/date';
import { useDiaryStore } from '../stores/diaryStore';

// 日习惯统计
export interface DailyHabitStats {
  date: string;         // YYYY-MM-DD
  water: number;        // mL
  steps: number;        // 步
  reading: boolean;
  language: boolean;
  supplements: boolean;
}

// 习惯目标
const HABIT_GOALS = {
  water: 1500,
  steps: 6000
};

// 解析习惯数据从日记区块行
function parseHabitLines(lines: string[]): HabitData {
  const data: HabitData = {
    water: 0,
    steps: 0,
    reading: false,
    language: false,
    supplements: false
  };

  for (const line of lines) {
    // 饮水格式：'- 🥛🥤🥤饮水 500 mL'
    if (line.includes('饮水')) {
      const match = line.match(/饮水\s+(\d+)\s*mL/);
      if (match) {
        data.water = parseInt(match[1], 10);
      }
    }

    // 步数格式：'- 🧘 运动/拉伸/快走 8000 步'
    if (line.includes('步')) {
      const match = line.match(/(\d+)\s*步/);
      if (match) {
        data.steps = parseInt(match[1], 10);
      }
    }

    // 阅读勾选格式：'- [x] 📖 阅读/亲子共读'
    if (line.includes('📖')) {
      data.reading = line.includes('[x]');
    }

    // 学语言勾选格式：'- [x] 🇬🇧 学语言'
    if (line.includes('🇬🇧')) {
      data.language = line.includes('[x]');
    }

    // 补充剂勾选格式：'- [x] 💊 鱼油/植物甾醇'
    if (line.includes('💊')) {
      data.supplements = line.includes('[x]');
    }
  }

  return data;
}

// 获取最近N天的日期列表
function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date); // 使用本地时间
    dates.push(dateStr);
  }

  return dates;
}

// 从日记条目转换为日统计
function entryToStats(entry: DiaryEntry): DailyHabitStats {
  const habitData = parseHabitLines(entry.sections.habits);
  return {
    date: entry.date,
    ...habitData
  };
}

// 从文件读取指定日期的习惯数据
async function readHabitFromFile(dateStr: string): Promise<DailyHabitStats | null> {
  try {
    const fileSync = getFileSyncService();
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    const content = await fileSync.readFile(date);
    const entry = parseDiary(content);
    entry.date = dateStr;

    // 缓存到IndexedDB
    await cacheDiary(entry);

    return entryToStats(entry);
  } catch (error) {
    console.log(`No diary file for ${dateStr}:`, error);
    return null;
  }
}

// 获取指定日期范围的习惯统计
async function fetchRemoteHabitStats(days: number): Promise<DailyHabitStats[]> {
  const { apiUrl, apiToken } = useDiaryStore.getState();
  
  const response = await fetch(`${apiUrl}/api/v1/stats/habit?days=${days}`, {
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch habit stats from API');
  }
  
  return await response.json();
}

export async function getHabitStats(days: number, forceReload = false): Promise<DailyHabitStats[]> {
  const { remoteMode, apiUrl, apiToken } = useDiaryStore.getState();
  
  if (remoteMode && apiUrl && apiToken) {
    return await fetchRemoteHabitStats(days);
  }

  const targetDates = getRecentDates(days);
  const cachedDiaries = forceReload ? [] : await getAllCachedDiaries();
  const diaryMap = new Map<string, DiaryEntry>();
  for (const entry of cachedDiaries) {
    diaryMap.set(entry.date, entry);
  }

  const stats: DailyHabitStats[] = [];

  for (const date of targetDates) {
    if (!forceReload) {
      const cachedEntry = diaryMap.get(date);
      if (cachedEntry) {
        stats.push(entryToStats(cachedEntry));
        continue;
      }
    }

    const fileStats = await readHabitFromFile(date);
    if (fileStats) {
      stats.push(fileStats);
    } else {
      stats.push({
        date,
        water: 0,
        steps: 0,
        reading: false,
        language: false,
        supplements: false
      });
    }
  }

  return stats;
}

// 计算汇总统计
export function calculateSummary(stats: DailyHabitStats[]) {
  if (stats.length === 0) {
    return {
      avgWater: 0,
      avgSteps: 0,
      waterGoalRate: 0,
      stepsGoalRate: 0,
      readingRate: 0,
      languageRate: 0,
      supplementsRate: 0
    };
  }

  const totalWater = stats.reduce((sum, s) => sum + s.water, 0);
  const totalSteps = stats.reduce((sum, s) => sum + s.steps, 0);

  const waterGoalMet = stats.filter(s => s.water >= HABIT_GOALS.water).length;
  const stepsGoalMet = stats.filter(s => s.steps >= HABIT_GOALS.steps).length;

  const readingCompleted = stats.filter(s => s.reading).length;
  const languageCompleted = stats.filter(s => s.language).length;
  const supplementsCompleted = stats.filter(s => s.supplements).length;

  return {
    avgWater: Math.round(totalWater / stats.length),
    avgSteps: Math.round(totalSteps / stats.length),
    waterGoalRate: Math.round((waterGoalMet / stats.length) * 100),
    stepsGoalRate: Math.round((stepsGoalMet / stats.length) * 100),
    readingRate: Math.round((readingCompleted / stats.length) * 100),
    languageRate: Math.round((languageCompleted / stats.length) * 100),
    supplementsRate: Math.round((supplementsCompleted / stats.length) * 100)
  };
}

// 获取趋势数据（用于折线图）
export function getTrendData(stats: DailyHabitStats[], type: 'water' | 'steps') {
  return stats.map(s => ({
    date: s.date.slice(5), // MM-DD格式
    value: s[type]
  }));
}

// 获取热力图数据（用于布尔习惯）
export function getHeatmapData(stats: DailyHabitStats[], type: 'reading' | 'language' | 'supplements') {
  return stats.map(s => ({
    date: s.date,
    completed: s[type]
  }));
}

export { HABIT_GOALS };