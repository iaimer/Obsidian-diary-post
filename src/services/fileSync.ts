import { DiaryEntry, DiarySection, HabitData } from '../types';
import { parseDiary } from '../utils/markdown';
import { getDateString, getTimestamp } from '../utils/date';
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

  // 获取日记（用于读取和显示）
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
      console.error('Failed to read diary file:', error);
      throw error;
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

    // 读取原文件内容
    const originalContent = await this.readFile(date);
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
    const originalContent = await this.readFile(date);
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

  // 读取文件
  private async readFile(date: Date): Promise<string> {
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