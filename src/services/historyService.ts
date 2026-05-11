import { DiaryMeta, MonthData } from '../types/history';
import { DiaryEntry } from '../types';
import { parseDiary } from '../utils/markdown';
import { getDateString } from '../utils/date';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class HistoryService {
  private vaultHandle: FileSystemDirectoryHandle | null = null;
  private imageCache: Map<string, string> = new Map(); // 图片URL缓存

  setVaultHandle(handle: FileSystemDirectoryHandle) {
    this.vaultHandle = handle;
  }

  async getMonthDiaries(year: number, month: number): Promise<MonthData> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    const diaries: DiaryMeta[] = [];
    const monthDirName = `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`;
    
    const basePath = `workspace/生活/日记/${year}/${monthDirName}`;
    const pathParts = basePath.split('/').filter(p => p);

    try {
      let currentHandle = this.vaultHandle;
      for (const part of pathParts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      // 遍历目录下的所有 .md 文件
      const entries = [];
      for await (const entry of currentHandle.values()) {
        entries.push(entry);
      }
      
      for (const handle of entries) {
        if (handle.kind === 'file' && handle.name.endsWith('.md')) {
          const name = handle.name;
          const dateStr = name.replace('.md', '');
          
          try {
            const fileHandle = handle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            const content = await file.text();
            const diary = parseDiary(content);
            diary.date = dateStr;

            const meta = this.extractDiaryMeta(diary);
            diaries.push(meta);
          } catch (error) {
            console.error(`Failed to parse diary ${name}:`, error);
          }
        }
      }
    } catch (error) {
      console.log(`Month directory not found: ${basePath}`);
      return { year, month, diaries: [] };
    }

    return { year, month, diaries };
  }

  extractDiaryMeta(diary: DiaryEntry): DiaryMeta {
    const images = diary.sections.images || [];
    const hasImages = images.length > 0 && images.some(line => line.includes('![['));
    
    let firstImage: string | undefined;
    if (hasImages) {
      const imageLine = images.find(line => line.includes('![['));
      if (imageLine) {
        const match = imageLine.match(/!\[\[(.*?)\]\]/);
        firstImage = match ? match[1] : undefined;
      }
    }

    const quickNotesCount = (diary.sections.quick_notes || [])
      .filter(l => l.trim() && !l.includes('<!--') && !l.includes('- **HH:MM** 内容 #标签'))
      .length;

    return {
      date: diary.date,
      hasImages,
      firstImage,
      quickNotesCount,
      exists: true
    };
  }

  async loadDiary(date: Date): Promise<DiaryEntry | null> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthDirName = `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`;
    const dateStr = getDateString(date);

    const basePath = `workspace/生活/日记/${year}/${monthDirName}`;
    const pathParts = basePath.split('/').filter(p => p);

    try {
      let currentHandle = this.vaultHandle;
      for (const part of pathParts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      const fileHandle = await currentHandle.getFileHandle(`${dateStr}.md`);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const diary = parseDiary(content);
      diary.date = dateStr;
      return diary;
    } catch (error) {
      console.log(`Diary not found: ${dateStr}`);
      return null;
    }
  }

  async loadImage(imageName: string, year: number, month?: number): Promise<string | null> {
    if (!this.vaultHandle) {
      throw new Error('Vault not connected');
    }

    // 检查缓存（使用year/imageName作为键）
    const cacheKey = `${year}/${imageName}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    // 优先级1：检查月份assets（YYYY/MM.EnglishMonth/assets）
    if (month) {
      const monthDirName = `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`;
      const monthAssetsPath = `workspace/生活/日记/${year}/${monthDirName}/assets`;
      
      try {
        const url = await this.tryLoadImageFromPath(monthAssetsPath, imageName, cacheKey);
        if (url) return url;
      } catch (error) {
        console.log(`Image not found in month assets: ${monthDirName}/assets`);
      }
    }

    // 优先级2：检查年份assets（YYYY/assets）
    const yearAssetsPath = `workspace/生活/日记/${year}/assets`;
    try {
      const url = await this.tryLoadImageFromPath(yearAssetsPath, imageName, cacheKey);
      if (url) return url;
    } catch (error) {
      console.log(`Image not found in year assets: ${year}/assets`);
    }

    return null;
  }

  // 尝试从指定路径加载图片
  private async tryLoadImageFromPath(
    basePath: string, 
    imageName: string, 
    cacheKey: string
  ): Promise<string | null> {
    const pathParts = basePath.split('/').filter(p => p);
    
    let currentHandle = this.vaultHandle!;
    for (const part of pathParts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    const fileHandle = await currentHandle.getFileHandle(imageName);
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    
    // 缓存图片URL
    this.imageCache.set(cacheKey, url);
    
    return url;
  }

  // 清除图片缓存
  clearImageCache() {
    this.imageCache.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.imageCache.clear();
  }
}

let historyService: HistoryService | null = null;

export function getHistoryService(): HistoryService {
  if (!historyService) {
    historyService = new HistoryService();
  }
  return historyService;
}