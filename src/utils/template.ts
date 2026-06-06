import { DiaryEntry, HabitConfig, HabitData, DEFAULT_HABIT_CONFIGS } from '../types';
import { getDateString, getWeekdayName } from './date';

// 创建新的日记模板（使用动态配置）
export function createNewDiary(date: Date, configs: HabitConfig[] = DEFAULT_HABIT_CONFIGS): DiaryEntry {
  const dateString = getDateString(date);
  const weekday = getWeekdayName(date);

  // 使用配置生成习惯区块
  const habits = formatHabitData(
    { water: 0, steps: 0, reading: false, language: false, supplements: false },
    configs
  );

  return {
    date: dateString,
    frontmatter: { tags: ['日记'] },
    title: `${weekday} · 此时此刻`,
    quote: '2026 年，如果只选一件事：**让健康和记录成为习惯。**',
    sections: {
      habits,
      quick_notes: [],
      happiness: [],
      anxiety: [],
      reflection: ['- '],
      lizhi_says: ['- '],
      tomorrow: ['- '],
      images: []
    },
    raw: ''
  };
}

// 格式化随手记
export function formatQuickNote(time: string, content: string, tags: string[]): string {
  const tagStr = tags.length > 0 ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
  return `- **${time}** ${content}${tagStr}`;
}

// 格式化觉察
export function formatReflection(time: string, content: string, tags: string[] = []): string {
  const tagStr = tags.length > 0 ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
  return `- **${time}** ${content}${tagStr}`;
}

// 格式化小确幸
export function formatHappiness(time: string, content: string, tags: string[] = []): string {
  const tagStr = tags.length > 0 ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
  return `> **${time}** ${content}${tagStr}`;
}

// 格式化焦虑时刻
export function formatAnxiety(content: string, tags: string[] = []): string {
  const tagStr = tags.length > 0 ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
  return `${content}${tagStr}`;
}

// 格式化习惯打卡（使用动态配置）
export function formatHabitData(habitData: HabitData, configs: HabitConfig[] = DEFAULT_HABIT_CONFIGS): string[] {
  // 按顺序排序并只处理启用的习惯
  const enabledConfigs = configs.filter(c => c.enabled).sort((a, b) => a.order - b.order);

  return enabledConfigs.map(config => {
    if (config.type === 'number') {
      const value = habitData[config.id as keyof HabitData];
      const numValue = typeof value === 'number' ? value : 0;

      // 饮水特殊格式：显示杯子emoji
      if (config.id === 'water') {
        const waterEmoji = '🥤';
        const waterCount = Math.floor(numValue / 250);
        const waterStr = waterCount > 0
          ? `🥛${waterEmoji.repeat(waterCount)}饮水 ${numValue} mL`
          : `- 🥛饮水 ${numValue} mL`;
        return `- ${waterStr}`;
      }

      // 其他数值型习惯
      return `- ${config.emoji} ${config.description || config.name} ${numValue} ${config.unit || ''}`;
    } else {
      // 布尔型习惯
      const value = habitData[config.id as keyof HabitData];
      const checked = typeof value === 'boolean' ? value : false;
      return `- [${checked ? 'x' : ' '}] ${config.emoji} ${config.description || config.name}`;
    }
  });
}
