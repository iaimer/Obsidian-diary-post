// 日记的区块类型
export enum DiarySection {
  HABITS = 'habits',
  QUICK_NOTES = 'quick_notes',
  HAPPINESS = 'happiness',
  ANXIETY = 'anxiety',
  REFLECTION = 'reflection',
  LIZHI_SAYS = 'lizhi_says',
  TOMORROW = 'tomorrow',
  IMAGES = 'images'
}

// 解析后的日记结构
export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  frontmatter: Record<string, any>;
  title: string;
  quote: string;
  sections: {
    habits: string[];
    quick_notes: string[];
    happiness: string[];
    anxiety: string[];
    reflection: string[];
    lizhi_says: string[];
    tomorrow: string[];
    images: string[];
  };
  raw: string; // 原始Markdown内容
}

// 习惯数据
export interface HabitData {
  water: number; // mL
  steps: number; // 步
  reading: boolean;
  language: boolean;
  supplements: boolean;
}

// 标签体系
export interface Tag {
  name: string;
  type: 'domain' | 'capability' | 'method';
}

// 随手记条目
export interface QuickNote {
  time: string; // HH:MM
  content: string;
  tags: string[];
}