import { DiaryEntry, DiarySection, HabitData } from '../types';
import { parseDiary } from '../utils/markdown';
import { getDateString, getTimestamp, getWeekdayName } from '../utils/date';
import { formatQuickNote, formatHappiness, formatReflection, formatHabitData } from '../utils/template';
import { cacheDiary } from '../db';

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

// 创建符合Obsidian模板的日记内容
function createObsidianDiaryContent(date: Date): string {
  const weekday = getWeekdayName(date);
  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push('tags:');
  lines.push('  - 日记');
  lines.push('---');

  // 标题
  lines.push(`# 🌿 ${weekday} · 此时此刻`);
  lines.push('> [!quote] 2026 年，如果只选一件事：**让健康和记录成为习惯。**');
  lines.push('');

  // 习惯打卡
  lines.push('---');
  lines.push(sectionHeaders[DiarySection.HABITS]);
  lines.push('- 🥛饮水 0 mL');
  lines.push('- 🧘 运动/拉伸/快走 0 步');
  lines.push('- [ ] 📖 阅读/亲子共读');
  lines.push('- [ ] 🇬🇧 学语言');
  lines.push('- [ ] 💊 鱼油/植物甾醇');
  lines.push('');

  // 随手记
  lines.push('---');
  lines.push(sectionHeaders[DiarySection.QUICK_NOTES]);
  lines.push('<!-- 随手记和灵感，文案喵会自动添加合适的标签 -->');
  lines.push('- **HH:MM** 内容 #标签');
  lines.push('');

  // 小确幸
  lines.push('---');
  lines.push(sectionHeaders[DiarySection.HAPPINESS]);
  lines.push('> [!success] 总有事件值得感恩🙏♥️');
  lines.push('> ');
  lines.push('');

  // 焦虑时刻
  lines.push('---');
  lines.push(sectionHeaders[DiarySection.ANXIETY]);
  lines.push('- 今天什么时候我感到焦虑/紧张？');
  lines.push('> ');
  lines.push('- 当时我在担心什么？（具体到一句话)');
  lines.push('> ');
  lines.push('- 我做了什么？');
  lines.push('> ');
  lines.push('- 这个应对是帮我面对了，还是帮我躲开了？');
  lines.push('>  ');
  lines.push('');

  // 每日复盘
  lines.push('---');
  lines.push('## 📈 每日复盘');
  lines.push(sectionHeaders[DiarySection.REFLECTION]);
  lines.push('<!-- 这里是你的观点和思考，荔枝喵会重点提取 -->');
  lines.push('- ');
  lines.push('');

  // 荔枝喵说
  lines.push(sectionHeaders[DiarySection.LIZHI_SAYS]);
  lines.push('<!-- 基于当天日记的客观反馈：模式识别、矛盾指出、批判性问题 -->');
  lines.push('- ');
  lines.push('');

  // 明日寄语
  lines.push(sectionHeaders[DiarySection.TOMORROW]);
  lines.push('- ');
  lines.push('');

  // 影像记录
  lines.push('---');
  lines.push(sectionHeaders[DiarySection.IMAGES]);

  return lines.join('\n');
}

// 文件同步服务
export class FileSyncService {
  private vaultHandle: FileSystemDirectoryHandle | null = null;

  // 连接Vault
  async connectVault(): Promise<boolean> {
    try {
      this.vaultHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      console.log('Vault connected:', this.vaultHandle?.name);
      return true;
    } catch (error) {
      console.error('Failed to connect vault:', error);
      return false;
    }
  }

  // 获取日记（用于读取和显示，文件不存在则创建）
  async getOrCreateDiary(date: Date): Promise<DiaryEntry> {
    const dateString = getDateString(date);
    console.log('Getting diary for:', dateString);

    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    try {
      const content = await this.readFile(date);
      console.log('File content loaded, length:', content.length);

      const entry = parseDiary(content);
      entry.date = dateString;

      await cacheDiary(entry);
      return entry;
    } catch (error) {
      console.log('File not found, creating new diary...');
      const newContent = createObsidianDiaryContent(date);
      await this.writeFile(date, newContent);

      const entry = parseDiary(newContent);
      entry.date = dateString;

      await cacheDiary(entry);
      return entry;
    }
  }

  // 直接追加内容到区块（不重新序列化整个文件）
  async appendToSection(
    date: Date,
    section: DiarySection,
    content: string
  ): Promise<void> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    // 尝试读取原文件内容，不存在则创建
    let originalContent: string;
    try {
      originalContent = await this.readFile(date);
    } catch (error) {
      console.log('File not found, creating new diary...');
      originalContent = createObsidianDiaryContent(date);
      await this.writeFile(date, originalContent);
    }

    const lines = originalContent.split('\n');

    // 找到区块位置
    const header = sectionHeaders[section];
    let sectionStartIndex = -1;
    let nextSectionIndex = -1;

    // 找到当前区块开始位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(header)) {
        sectionStartIndex = i;
        break;
      }
    }

    if (sectionStartIndex === -1) {
      throw new Error(`Section not found: ${section}`);
    }

    // 如果是随手记区块，删除模板中的示例行
    if (section === DiarySection.QUICK_NOTES) {
      for (let i = sectionStartIndex + 1; i < lines.length; i++) {
        if (lines[i].includes('- **HH:MM** 内容 #标签')) {
          lines.splice(i, 1);
          break;
        }
      }
    }

    // 找到下一个区块的位置（用于确定插入点）
    const allHeaders = Object.values(sectionHeaders);
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
      if (allHeaders.some(h => lines[i].startsWith(h))) {
        nextSectionIndex = i;
        break;
      }
    }

    // 确定插入位置：在下一个区块之前，找到最后一个非空行
    let insertIndex = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;

    // 向前查找，跳过空行和分隔线
    while (insertIndex > sectionStartIndex + 1) {
      const prevLine = lines[insertIndex - 1];
      if (prevLine.trim() === '' || prevLine.trim() === '---') {
        insertIndex--;
      } else {
        break;
      }
    }

    // 插入新内容（直接追加，不添加分隔线）
    lines.splice(insertIndex, 0, content);

    // 写入更新后的文件
    const updatedContent = lines.join('\n');
    await this.writeFile(date, updatedContent);

    // 更新缓存
    const entry = parseDiary(updatedContent);
    entry.date = getDateString(date);
    await cacheDiary(entry);
  }

  // 追加随手记
  async appendQuickNote(content: string, tags: string[]): Promise<void> {
    const time = getTimestamp();
    const formatted = formatQuickNote(time, content, tags);
    await this.appendToSection(new Date(), DiarySection.QUICK_NOTES, formatted);
  }

  // 追加觉察
  async appendReflection(content: string): Promise<void> {
    const formatted = formatReflection(content);
    await this.appendToSection(new Date(), DiarySection.REFLECTION, formatted);
  }

  // 追加小确幸
  async appendHappiness(content: string): Promise<void> {
    const formatted = formatHappiness(content);
    await this.appendToSection(new Date(), DiarySection.HAPPINESS, formatted);
  }

  // 更新习惯打卡（替换整个习惯区块）
  async updateHabits(habitData: HabitData): Promise<void> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    const date = new Date();
    // 尝试读取原文件内容，不存在则创建
    let originalContent: string;
    try {
      originalContent = await this.readFile(date);
    } catch (error) {
      console.log('File not found, creating new diary...');
      originalContent = createObsidianDiaryContent(date);
      await this.writeFile(date, originalContent);
    }

    const lines = originalContent.split('\n');

    const header = sectionHeaders[DiarySection.HABITS];
    let sectionStartIndex = -1;
    let nextSectionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(header)) {
        sectionStartIndex = i;
        break;
      }
    }

    if (sectionStartIndex === -1) {
      throw new Error('Habits section not found');
    }

    const allHeaders = Object.values(sectionHeaders);
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
      if (allHeaders.some(h => lines[i].startsWith(h))) {
        nextSectionIndex = i;
        break;
      }
    }

    // 删除旧的习内容
    const deleteEnd = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;
    const newHabits = formatHabitData(habitData);

    // 替换习惯区块内容
    const before = lines.slice(0, sectionStartIndex + 1);
    const after = lines.slice(deleteEnd);
    const updatedLines = [...before, ...newHabits, '', ...after];

    const updatedContent = updatedLines.join('\n');
    await this.writeFile(date, updatedContent);

    const entry = parseDiary(updatedContent);
    entry.date = getDateString(date);
    await cacheDiary(entry);
  }

  // 读取文件（公开方法，用于统计页面读取历史数据）
  async readFile(date: Date): Promise<string> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    const pathParts = this.getPathParts(date);
    console.log('Reading file path:', pathParts.join('/'));

    let currentHandle = this.vaultHandle;
    for (let i = 0; i < pathParts.length - 1; i++) {
      console.log(`Entering directory: ${pathParts[i]}`);
      currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
    }

    const fileName = pathParts[pathParts.length - 1];
    console.log('Reading file:', fileName);

    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  // 写入文件
  private async writeFile(date: Date, content: string): Promise<void> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    const pathParts = this.getPathParts(date);
    console.log('Writing file path:', pathParts.join('/'));

    let currentHandle = this.vaultHandle;
    for (let i = 0; i < pathParts.length - 1; i++) {
      try {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      } catch {
        console.log(`Creating directory: ${pathParts[i]}`);
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
      }
    }

    const fileName = pathParts[pathParts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    console.log('File written:', fileName);
  }

  // 获取路径部分
  private getPathParts(date: Date): string[] {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const day = getDateString(date);

    return [
      'workspace',
      '生活',
      '日记',
      year.toString(),
      `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`,
      `${day}.md`
    ];
  }
}

// 单例
let fileSyncService: FileSyncService | null = null;

export function getFileSyncService(): FileSyncService {
  if (!fileSyncService) {
    fileSyncService = new FileSyncService();
  }
  return fileSyncService;
}