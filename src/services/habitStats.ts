// 习惯统计数据服务

import { HabitData, DiaryEntry, HabitConfig, DEFAULT_HABIT_CONFIGS } from '../types';
import { getAllCachedDiaries, cacheDiary } from '../db';
import { getFileSyncService } from './fileSync';
import { parseDiary } from '../utils/markdown';
import { getDateString } from '../utils/date';
import { useDiaryStore } from '../stores/diaryStore';

// 日习惯统计
export interface DailyHabitStats {
  date: string;         // YYYY-MM-DD
  [habitId: string]: number | boolean | string;  // 动态习惯数据
}

// 解析习惯数据从日记区块行（使用动态配置）
function parseHabitLines(lines: string[], configs: HabitConfig[]): HabitData {
  // 先用默认值初始化
  const data: HabitData = {
    water: 0,
    steps: 0,
    reading: false,
    language: false,
    supplements: false
  };

  // 兼容旧格式解析（确保向后兼容）
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

    // 动态习惯解析：匹配配置中的 emoji 或名称
    for (const config of configs) {
      // 跳过默认习惯（已有专门解析）
      if (['water', 'steps', 'reading', 'language', 'supplements'].includes(config.id)) continue;

      if (line.includes(config.emoji) || line.includes(config.name) || (config.description && line.includes(config.description))) {
        if (config.type === 'number') {
          const match = line.match(/(\d+)/);
          if (match) {
            // 对于自定义习惯，使用默认值（暂不支持）
            // data[config.id] = parseInt(match[1], 10);
          }
        }
      }
    }
  }

  return data;
}

// 获取习惯目标值（从配置）
function getHabitGoals(configs: HabitConfig[]): Record<string, number> {
  const goals: Record<string, number> = {};
  for (const config of configs) {
    if (config.type === 'number' && config.goal) {
      goals[config.id] = config.goal;
    }
  }
  return goals;
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

// 从日记条目转换为日统计（使用配置）
function entryToStats(entry: DiaryEntry, configs: HabitConfig[]): DailyHabitStats {
  const habitData = parseHabitLines(entry.sections.habits, configs);
  return {
    date: entry.date,
    ...habitData
  };
}

// 从文件读取指定日期的习惯数据
async function readHabitFromFile(dateStr: string, configs: HabitConfig[]): Promise<DailyHabitStats | null> {
  try {
    const fileSync = getFileSyncService();
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    const content = await fileSync.readFile(date);
    const entry = parseDiary(content);
    entry.date = dateStr;

    // 缓存到IndexedDB
    await cacheDiary(entry);

    return entryToStats(entry, configs);
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
  const { remoteMode, apiUrl, apiToken, habitConfigs } = useDiaryStore.getState();
  const configs = habitConfigs || DEFAULT_HABIT_CONFIGS;

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
        stats.push(entryToStats(cachedEntry, configs));
        continue;
      }
    }

    const fileStats = await readHabitFromFile(date, configs);
    if (fileStats) {
      stats.push(fileStats);
    } else {
      // 创建空统计
      const emptyStats: DailyHabitStats = { date };
      for (const config of configs) {
        emptyStats[config.id] = config.type === 'number' ? 0 : false;
      }
      stats.push(emptyStats);
    }
  }

  return stats;
}

// 计算汇总统计（使用动态配置）
export function calculateSummary(stats: DailyHabitStats[], configs: HabitConfig[] = DEFAULT_HABIT_CONFIGS) {
  if (stats.length === 0) {
    const emptySummary: Record<string, number> = {};
    for (const config of configs) {
      if (config.type === 'number') {
        emptySummary[`avg${config.id}`] = 0;
        emptySummary[`${config.id}GoalRate`] = 0;
      } else {
        emptySummary[`${config.id}Rate`] = 0;
      }
    }
    return emptySummary;
  }

  const goals = getHabitGoals(configs);
  const summary: Record<string, number> = {};

  for (const config of configs) {
    if (config.type === 'number') {
      const total = stats.reduce((sum, s) => sum + (s[config.id] as number || 0), 0);
      summary[`avg${config.id}`] = Math.round(total / stats.length);

      const goal = goals[config.id] || 100;
      const goalMet = stats.filter(s => (s[config.id] as number || 0) >= goal).length;
      summary[`${config.id}GoalRate`] = Math.round((goalMet / stats.length) * 100);
    } else {
      const completed = stats.filter(s => s[config.id] as boolean).length;
      summary[`${config.id}Rate`] = Math.round((completed / stats.length) * 100);
    }
  }

  // 兼容旧接口
  summary.avgWater = summary.avgwater || 0;
  summary.avgSteps = summary.avgsteps || 0;
  summary.waterGoalRate = summary.waterGoalRate || 0;
  summary.stepsGoalRate = summary.stepsGoalRate || 0;
  summary.readingRate = summary.readingRate || 0;
  summary.languageRate = summary.languageRate || 0;
  summary.supplementsRate = summary.supplementsRate || 0;

  return summary;
}

// 获取趋势数据（用于折线图）
export function getTrendData(stats: DailyHabitStats[], type: 'water' | 'steps') {
  return stats.map(s => ({
    date: s.date.slice(5), // MM-DD格式
    value: s[type] as number
  }));
}

// 获取热力图数据（用于布尔习惯）
export function getHeatmapData(stats: DailyHabitStats[], type: 'reading' | 'language' | 'supplements') {
  return stats.map(s => ({
    date: s.date,
    completed: s[type] as boolean
  }));
}

// 获取习惯目标值（导出供外部使用）
export function getHabitGoal(configs: HabitConfig[] = DEFAULT_HABIT_CONFIGS, habitId: string): number {
  const config = configs.find(c => c.id === habitId);
  return config?.goal || 100;
}

// 兼容导出
export const HABIT_GOALS = { water: 1500, steps: 6000 };