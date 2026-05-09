import { DiaryEntry } from '../types';
import { getDateString, getWeekdayName } from './date';

// 创建新的日记模板
export function createNewDiary(date: Date): DiaryEntry {
  const dateString = getDateString(date);
  const weekday = getWeekdayName(date);

  return {
    date: dateString,
    frontmatter: { tags: ['日记'] },
    title: `${weekday} · 此时此刻`,
    quote: '2026 年，如果只选一件事：**让健康和记录成为习惯。**',
    sections: {
      habits: [
        '- 🥛🥤饮水 0 mL',
        '- 🧘 运动/拉伸/快走 0 步',
        '- [ ] 📖 阅读/亲子共读',
        '- [ ] 🇬🇧 学语言',
        '- [ ] 💊 鱼油/植物甾醇'
      ],
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

// 格式化小确幸
export function formatHappiness(content: string): string {
  return `> ${content}`;
}

// 格式化觉察
export function formatReflection(content: string): string {
  return `- ${content}`;
}

// 格式化习惯打卡
export function formatHabitData(habitData: {
  water: number;
  steps: number;
  reading: boolean;
  language: boolean;
  supplements: boolean;
}): string[] {
  const waterEmoji = '🥤';
  const waterCount = Math.floor(habitData.water / 250); // 每250ml一个🥤
  const waterStr = waterCount > 0 ? `🥛${waterEmoji.repeat(waterCount)}饮水 ${habitData.water} mL` : `- 🥛饮水 ${habitData.water} mL`;

  return [
    `- ${waterStr}`,
    `- 🧘 运动/拉伸/快走 ${habitData.steps} 步`,
    `- [${habitData.reading ? 'x' : ' '}] 📖 阅读/亲子共读`,
    `- [${habitData.language ? 'x' : ' '}] 🇬🇧 学语言`,
    `- [${habitData.supplements ? 'x' : ' '}] 💊 鱼油/植物甾醇`
  ];
}