import { DiaryEntry, DiarySection, HabitData } from '../types';
import { parseDiary, serializeDiary, appendToSection } from '../utils/markdown';
import { getDiaryPath, getDateString, getTimestamp } from '../utils/date';
import { createNewDiary, formatQuickNote, formatHappiness, formatReflection, formatHabitData } from '../utils/template';

// 日记服务
export class DiaryService {
  private basePath: string;
  private fileHandle: FileSystemDirectoryHandle | null = null;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // 连接到Obsidian Vault
  async connectVault(): Promise<boolean> {
    try {
      // 使用File System Access API
      this.fileHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      return true;
    } catch (error) {
      console.error('Failed to connect vault:', error);
      return false;
    }
  }

  // 获取或创建当日日记
  async getOrCreateToday(): Promise<DiaryEntry> {
    const today = new Date();
    return this.getOrCreateDiary(today);
  }

  // 获取或创建指定日期的日记
  async getOrCreateDiary(date: Date): Promise<DiaryEntry> {
    const dateString = getDateString(date);

    try {
      const content = await this.readDiaryFile(date);
      const entry = parseDiary(content);
      entry.date = dateString;
      return entry;
    } catch (error) {
      // 文件不存在，创建新日记
      const newEntry = createNewDiary(date);
      await this.writeDiaryFile(date, serializeDiary(newEntry));
      return newEntry;
    }
  }

  // 追加随手记
  async appendQuickNote(content: string, tags: string[] = []): Promise<void> {
    const entry = await this.getOrCreateToday();
    const time = getTimestamp();
    const formatted = formatQuickNote(time, content, tags);

    const updated = appendToSection(entry, DiarySection.QUICK_NOTES, formatted);
    await this.writeDiaryFile(new Date(), serializeDiary(updated));
  }

  // 追加觉察
  async appendReflection(content: string): Promise<void> {
    const entry = await this.getOrCreateToday();
    const formatted = formatReflection(content);

    const updated = appendToSection(entry, DiarySection.REFLECTION, formatted);
    await this.writeDiaryFile(new Date(), serializeDiary(updated));
  }

  // 追加小确幸
  async appendHappiness(content: string): Promise<void> {
    const entry = await this.getOrCreateToday();
    const formatted = formatHappiness(content);

    const updated = appendToSection(entry, DiarySection.HAPPINESS, formatted);
    await this.writeDiaryFile(new Date(), serializeDiary(updated));
  }

  // 更新习惯打卡
  async updateHabits(habitData: HabitData): Promise<void> {
    const entry = await this.getOrCreateToday();
    const formatted = formatHabitData(habitData);

    // 替换习惯区块
    entry.sections.habits = formatted;
    entry.raw = serializeDiary(entry);

    await this.writeDiaryFile(new Date(), serializeDiary(entry));
  }

  // 读取日记文件
  private async readDiaryFile(date: Date): Promise<string> {
    if (!this.fileHandle) {
      throw new Error('Vault not connected');
    }

    const path = getDiaryPath(date, this.basePath);
    const pathParts = path.split('/').filter(p => p);

    // 遍历目录结构
    let currentHandle = this.fileHandle;
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
    }

    // 获取文件
    const fileName = pathParts[pathParts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    return await file.text();
  }

  // 写入日记文件
  private async writeDiaryFile(date: Date, content: string): Promise<void> {
    if (!this.fileHandle) {
      throw new Error('Vault not connected');
    }

    const path = getDiaryPath(date, this.basePath);
    const pathParts = path.split('/').filter(p => p);

    // 创建目录结构
    let currentHandle = this.fileHandle;
    for (let i = 0; i < pathParts.length - 1; i++) {
      try {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      } catch {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
      }
    }

    // 写入文件
    const fileName = pathParts[pathParts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
}

// 创建单例服务实例
let diaryService: DiaryService | null = null;

export function getDiaryService(basePath: string): DiaryService {
  if (!diaryService) {
    diaryService = new DiaryService(basePath);
  }
  return diaryService;
}