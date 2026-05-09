// 习惯统计数据服务

import { HabitData, DiaryEntry } from '../types';
import { getAllCachedDiaries } from '../db';

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
    const dateStr = date.toISOString().split('T')[0];
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

// 获取指定日期范围的习惯统计
export async function getHabitStats(days: number): Promise<DailyHabitStats[]> {
  // 获取日期范围
  const targetDates = getRecentDates(days);

  // 从缓存获取所有日记
  const cachedDiaries = await getAllCachedDiaries();

  // 创建日期到日记的映射
  const diaryMap = new Map<string, DiaryEntry>();
  for (const entry of cachedDiaries) {
    diaryMap.set(entry.date, entry);
  }

  // 生成统计数据
  const stats: DailyHabitStats[] = [];
  for (const date of targetDates) {
    const entry = diaryMap.get(date);
    if (entry) {
      stats.push(entryToStats(entry));
    } else {
      // 无数据的日期填充默认值
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