import { DiaryEntry, HabitData } from '../types';
import { getFileSyncService } from './fileSync';
import { useDiaryStore } from '../stores/diaryStore';
import { compressImage, blobToBase64, generateImageFilename } from './imageService';

export { getFileSyncService };

// DataService 接口
export interface DataService {
  // 连接 Vault（仅 local 模式需要）
  connectVault(): Promise<boolean>;
  
  // 检查日记是否存在
  checkDiaryExists(date: Date): Promise<boolean>;
  
  // 创建日记
  createDiary(date: Date): Promise<void>;
  
  // 获取日记
  getDiary(date: Date): Promise<DiaryEntry>;
  
  // 追加随手记
  appendQuickNote(content: string, tags: string[]): Promise<void>;
  
  // 追加小确幸
  appendHappiness(content: string, tags?: string[]): Promise<void>;
  
  // 追加觉察
  appendReflection(content: string, tags?: string[]): Promise<void>;
  
  // 更新习惯
  updateHabits(habitData: HabitData): Promise<void>;
  
  // 检查是否已连接
  isConnected(): boolean;

  // 上传图片（压缩后保存到 vault assets 并追加引用）
  uploadImage(file: File, date: Date): Promise<void>;
}

// 本地数据服务（File System Access API）
export class LocalDataService implements DataService {
  private fileSync = getFileSyncService();
  
  async connectVault(): Promise<boolean> {
    return await this.fileSync.connectVault();
  }
  
  async checkDiaryExists(date: Date): Promise<boolean> {
    return await this.fileSync.checkDiaryExists(date);
  }
  
  async createDiary(date: Date): Promise<void> {
    await this.fileSync.createDiary(date);
  }
  
  async getDiary(date: Date): Promise<DiaryEntry> {
    return await this.fileSync.getOrCreateDiary(date);
  }
  
  async appendQuickNote(content: string, tags: string[]): Promise<void> {
    await this.fileSync.appendQuickNote(content, tags);
  }
  
  async appendHappiness(content: string, tags: string[] = []): Promise<void> {
    await this.fileSync.appendHappiness(content, tags);
  }
  
  async appendReflection(content: string, tags: string[] = []): Promise<void> {
    await this.fileSync.appendReflection(content, tags);
  }
  
  async updateHabits(habitData: HabitData): Promise<void> {
    await this.fileSync.updateHabits(habitData);
  }

  async uploadImage(file: File, date: Date): Promise<void> {
    const config = useDiaryStore.getState().imageConfig;
    const blob = await compressImage(file, config);
    const seq = await this.fileSync.getNextImageSequence(date, config.nameFormat);
    const filename = generateImageFilename(date, seq, config.nameFormat);
    await this.fileSync.saveImageToAssets(date, blob, filename);
    await this.fileSync.appendImageReference(date, filename);
  }
  
  isConnected(): boolean {
    return useDiaryStore.getState().vaultConnected;
  }
}

// 远程数据服务（HTTP API）
export class RemoteDataService implements DataService {
  private apiUrl: string;
  private apiToken: string;
  
  constructor(apiUrl: string, apiToken: string) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }
  
  async connectVault(): Promise<boolean> {
    // 远程模式不需要连接 Vault
    return true;
  }
  
  private async fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return await response.json();
  }
  
  async checkDiaryExists(date: Date): Promise<boolean> {
    const dateStr = this.formatDate(date);
    try {
      const result = await this.fetchAPI(`/api/v1/diary/exists/${dateStr}`);
      return result.exists === true;
    } catch {
      return false;
    }
  }
  
  async createDiary(date: Date): Promise<void> {
    const dateStr = this.formatDate(date);
    await this.fetchAPI('/api/v1/diary/create', {
      method: 'POST',
      body: JSON.stringify({ date: dateStr })
    });
  }
  
  async getDiary(date: Date): Promise<DiaryEntry> {
    const dateStr = this.formatDate(date);
    return await this.fetchAPI(`/api/v1/diary/${dateStr}`);
  }
  
  async appendQuickNote(content: string, tags: string[]): Promise<void> {
    await this.fetchAPI('/api/v1/diary/quick-note', {
      method: 'POST',
      body: JSON.stringify({ content, tags })
    });
  }
  
  async appendHappiness(content: string, tags: string[] = []): Promise<void> {
    await this.fetchAPI('/api/v1/diary/happiness', {
      method: 'POST',
      body: JSON.stringify({ content, tags })
    });
  }
  
  async appendReflection(content: string, tags: string[] = []): Promise<void> {
    await this.fetchAPI('/api/v1/diary/reflection', {
      method: 'POST',
      body: JSON.stringify({ content, tags })
    });
  }
  
  async updateHabits(habitData: HabitData): Promise<void> {
    await this.fetchAPI('/api/v1/diary/habit', {
      method: 'POST',
      body: JSON.stringify(habitData)
    });
  }

  async uploadImage(file: File, date: Date): Promise<void> {
    const blob = await compressImage(file);
    const base64 = await blobToBase64(blob);
    
    const dateStr = this.formatDate(date);
    await this.fetchAPI('/api/v1/diary/image/upload', {
      method: 'POST',
      body: JSON.stringify({ date: dateStr, imageData: base64 })
    });
  }
  
  isConnected(): boolean {
    // 远程模式总是返回 true（依赖 API 可用性）
    return true;
  }
  
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// 数据服务工厂
let dataService: DataService | null = null;

export function getDataService(): DataService {
  if (!dataService) {
    const { remoteMode, apiUrl, apiToken } = useDiaryStore.getState();
    
    if (remoteMode && apiUrl && apiToken) {
      dataService = new RemoteDataService(apiUrl, apiToken);
    } else {
      dataService = new LocalDataService();
    }
  }
  return dataService;
}

// 重置数据服务（切换模式时调用）
export function resetDataService(): void {
  dataService = null;
}