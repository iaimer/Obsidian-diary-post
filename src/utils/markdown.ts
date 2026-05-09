import { DiaryEntry, DiarySection } from '../types';

// 区块标题映射
const sectionHeaders: Record<DiarySection, string> = {
  [DiarySection.HABITS]: '## 🏃 习惯打卡',
  [DiarySection.QUICK_NOTES]: '## ✍️ 随手记 & 灵感',
  [DiarySection.HAPPINESS]: '## ✨ 每日小确幸',
  [DiarySection.ANXIETY]: '## 😰 焦虑时刻',
  [DiarySection.REFLECTION]: '### 💡 觉察与迭代',
  [DiarySection.LIZHI_SAYS]: '### 🧠 荔枝喵说',
  [DiarySection.TOMORROW]: '### 🌙 明日寄语',
  [DiarySection.IMAGES]: '## 📸 影像记录'
};

// 解析日记Markdown内容
export function parseDiary(content: string): DiaryEntry {
  const lines = content.split('\n');

  // 解析YAML frontmatter
  let frontmatter: Record<string, any> = {};
  let startIndex = 0;

  if (lines[0] === '---') {
    const endIndex = lines.indexOf('---', 1);
    if (endIndex !== -1) {
      const yamlContent = lines.slice(1, endIndex).join('\n');
      frontmatter = parseYaml(yamlContent);
      startIndex = endIndex + 1;
    }
  }

  // 解析标题和引用
  let title = '';
  let quote = '';
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].slice(2);
      startIndex = i + 1;
      break;
    }
  }

  // 查找引用块
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].startsWith('> [!quote]')) {
      quote = lines[i].slice(11).trim();
      startIndex = i + 1;
      break;
    }
  }

  // 解析各个区块
  const sections = {
    habits: [] as string[],
    quick_notes: [] as string[],
    happiness: [] as string[],
    anxiety: [] as string[],
    reflection: [] as string[],
    lizhi_says: [] as string[],
    tomorrow: [] as string[],
    images: [] as string[]
  };

  let currentSection: DiarySection | null = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // 检查是否是区块标题
    for (const [section, header] of Object.entries(sectionHeaders)) {
      if (line.startsWith(header)) {
        currentSection = section as DiarySection;
        break;
      }
    }

    // 如果当前行是区块标题，跳过
    if (Object.values(sectionHeaders).some(h => line.startsWith(h))) {
      continue;
    }

    // 如果有当前区块且行不为空，添加内容
    if (currentSection && line.trim()) {
      // 跳过分隔线
      if (line.trim() === '---') {
        continue;
      }
      // 跳过区块的引导文字（如 "> [!success]"）
      if (line.startsWith('> [!') && !line.startsWith('> [!quote]')) {
        continue;
      }
      sections[currentSection].push(line);
    }
  }

  return {
    date: '', // 需要外部设置
    frontmatter,
    title,
    quote,
    sections,
    raw: content
  };
}

// 简单YAML解析
function parseYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    // 处理数组
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/'/g, '').replace(/"/g, ''));
      result[key] = items;
    } else if (value.startsWith('-')) {
      // 多行数组格式
      result[key] = [value.slice(1).trim().replace(/'/g, '').replace(/"/g, '')];
    } else {
      result[key] = value.replace(/'/g, '').replace(/"/g, '');
    }
  }

  return result;
}

// 序列化日记为Markdown
export function serializeDiary(entry: DiaryEntry): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push('tags:');
  lines.push('  - 日记');
  lines.push('---');

  // 标题
  lines.push('');
  lines.push(`# 🌿 ${entry.title || '此时此刻'}`);

  // 引用
  if (entry.quote) {
    lines.push(`> [!quote] ${entry.quote}`);
  }
  lines.push('');

  // 习惯打卡
  lines.push(sectionHeaders[DiarySection.HABITS]);
  for (const item of entry.sections.habits) {
    lines.push(item);
  }
  lines.push('');

  // 随手记
  lines.push(sectionHeaders[DiarySection.QUICK_NOTES]);
  for (const item of entry.sections.quick_notes) {
    lines.push(item);
  }
  lines.push('');

  // 小确幸
  lines.push(sectionHeaders[DiarySection.HAPPINESS]);
  lines.push('> [!success] 总有事件值得感恩🙏♥️');
  for (const item of entry.sections.happiness) {
    lines.push(item);
  }
  lines.push('');

  // 焦虑时刻（可选）
  if (entry.sections.anxiety.length > 0) {
    lines.push(sectionHeaders[DiarySection.ANXIETY]);
    for (const item of entry.sections.anxiety) {
      lines.push(item);
    }
    lines.push('');
  }

  // 每日复盘
  lines.push('## 📈 每日复盘');

  // 觉察与迭代
  lines.push(sectionHeaders[DiarySection.REFLECTION]);
  for (const item of entry.sections.reflection) {
    lines.push(item);
  }
  lines.push('');

  // 荔枝喵说
  lines.push(sectionHeaders[DiarySection.LIZHI_SAYS]);
  for (const item of entry.sections.lizhi_says) {
    lines.push(item);
  }
  lines.push('');

  // 明日寄语
  lines.push(sectionHeaders[DiarySection.TOMORROW]);
  for (const item of entry.sections.tomorrow) {
    lines.push(item);
  }
  lines.push('');

  // 影像记录
  lines.push(sectionHeaders[DiarySection.IMAGES]);
  for (const item of entry.sections.images) {
    lines.push(item);
  }

  return lines.join('\n');
}

// 追加内容到指定区块
export function appendToSection(
  entry: DiaryEntry,
  section: DiarySection,
  content: string
): DiaryEntry {
  const newEntry = { ...entry, sections: { ...entry.sections } };

  // 确保区块存在
  if (!newEntry.sections[section]) {
    newEntry.sections[section] = [];
  }

  // 追加内容
  newEntry.sections[section] = [...newEntry.sections[section], content];

  // 更新原始内容
  newEntry.raw = serializeDiary(newEntry);

  return newEntry;
}