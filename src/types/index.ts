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

// 习惯数据（兼容旧格式）
export interface HabitData {
  water: number; // mL
  steps: number; // 步
  reading: boolean;
  language: boolean;
  supplements: boolean;
}

// 习惯配置类型
export interface HabitConfig {
  id: string;              // 唯一标识
  name: string;            // 显示名称
  emoji: string;           // emoji图标
  type: 'number' | 'boolean';  // 数值型或布尔型
  goal?: number;           // 数值型目标值
  unit?: string;           // 数值型单位（mL、步）
  description?: string;    // 描述文字
  enabled: boolean;        // 是否启用
  order: number;           // 显示顺序
  color?: string;          // 背景颜色（如 'blue', 'green', 'orange', 'purple', 'pink'）
}

// 动态习惯数据
export interface DynamicHabitData {
  [habitId: string]: number | boolean;
}

// 默认习惯配置
export const DEFAULT_HABIT_CONFIGS: HabitConfig[] = [
  {
    id: 'water',
    name: '饮水',
    emoji: '💧',
    type: 'number',
    goal: 1500,
    unit: 'mL',
    enabled: true,
    order: 1,
    color: 'blue'
  },
  {
    id: 'steps',
    name: '运动',
    emoji: '🏃',
    type: 'number',
    goal: 6000,
    unit: '步',
    description: '运动/拉伸/快走',
    enabled: true,
    order: 2,
    color: 'green'
  },
  {
    id: 'reading',
    name: '阅读',
    emoji: '📖',
    type: 'boolean',
    description: '阅读/亲子共读',
    enabled: true,
    order: 3,
    color: 'orange'
  },
  {
    id: 'language',
    name: '学语言',
    emoji: '🇬🇧',
    type: 'boolean',
    enabled: true,
    order: 4,
    color: 'purple'
  },
  {
    id: 'supplements',
    name: '补充剂',
    emoji: '💊',
    type: 'boolean',
    description: '鱼油/植物甾醇',
    enabled: true,
    order: 5,
    color: 'pink'
  }
];

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