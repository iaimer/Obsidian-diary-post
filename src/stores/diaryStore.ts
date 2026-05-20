import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiaryEntry, HabitData } from '../types';

export interface ImageCompressConfig {
  maxLongSide: number;    // 最大长边像素
  maxSizeMB: number;      // 最大文件大小 MB
  quality: number;        // JPEG 质量 0-1
  nameFormat: string;     // 文件名格式，{date}=YYYYMMDD, {seq}=序号
}

const defaultImageConfig: ImageCompressConfig = {
  maxLongSide: 2000,
  maxSizeMB: 2,
  quality: 0.7,
  nameFormat: 'Image-{date}-{seq}'
};

export function getFormatDateStr(date: Date): string {
  return date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
}

interface DiaryState {
  // 连接状态
  vaultConnected: boolean;
  wasConnected: boolean;

  // 远程模式配置
  remoteMode: boolean;
  apiUrl: string;
  apiToken: string;

  // 图片压缩配置
  imageConfig: ImageCompressConfig;

  // 当前日记
  currentDiary: DiaryEntry | null;

  // 习惯数据
  habitData: HabitData;

  // 刷新触发器（每次写入后更新，触发DiaryView刷新）
  refreshKey: number;

  // 操作
  setVaultConnected: (connected: boolean) => void;
  setRemoteMode: (mode: boolean) => void;
  setApiConfig: (url: string, token: string) => void;
  setImageConfig: (config: Partial<ImageCompressConfig>) => void;
  resetImageConfig: () => void;
  updateHabitData: (data: Partial<HabitData>) => void;
  setCurrentDiary: (diary: DiaryEntry | null) => void;
  triggerRefresh: () => void; // 触发刷新
}

// API 默认配置
const DEFAULT_API_TOKEN = 'diary-app-secret-token-2026';

// 根据环境获取默认 API 地址
function getDefaultApiUrl(): string {
  // 生产环境（非 localhost）使用远程 API（不包含 /api/v1）
  if (typeof window !== 'undefined' && !window.location.hostname.match(/localhost|127\.0\.0\.1/)) {
    return 'https://obsidian.femkits.org';
  }
  // 开发环境使用本地 API
  return 'http://localhost:4001';
}

// 根据环境获取默认远程模式
function getDefaultRemoteMode(): boolean {
  // 生产环境默认启用远程模式
  if (typeof window !== 'undefined' && !window.location.hostname.match(/localhost|127\.0\.0\.1/)) {
    return true;
  }
  return false;
}

const defaultHabitData: HabitData = {
  water: 0,
  steps: 0,
  reading: false,
  language: false,
  supplements: false
};

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      vaultConnected: false,
      wasConnected: false,
      remoteMode: getDefaultRemoteMode(),
      apiUrl: getDefaultApiUrl(),
      apiToken: DEFAULT_API_TOKEN,
      imageConfig: defaultImageConfig,
      currentDiary: null,
      habitData: defaultHabitData,
      refreshKey: 0,

      setVaultConnected: (connected: boolean) => {
        set({ vaultConnected: connected, wasConnected: connected });
      },

      setRemoteMode: (mode: boolean) => {
        set({ remoteMode: mode });
      },

      setApiConfig: (url: string, token: string) => {
        set({ apiUrl: url, apiToken: token });
      },

      setImageConfig: (config: Partial<ImageCompressConfig>) => {
        set((state) => ({
          imageConfig: { ...state.imageConfig, ...config }
        }));
      },

      resetImageConfig: () => {
        set({ imageConfig: defaultImageConfig });
      },

      updateHabitData: (data: Partial<HabitData>) => {
        set((state) => ({
          habitData: { ...state.habitData, ...data }
        }));
      },

      setCurrentDiary: (diary: DiaryEntry | null) => {
        set({ currentDiary: diary });
      },

      triggerRefresh: () => {
        set((state) => ({ refreshKey: state.refreshKey + 1 }));
      }
    }),
    {
      name: 'diary-storage',
      partialize: (state) => ({
        wasConnected: state.wasConnected,
        habitData: state.habitData,
        remoteMode: state.remoteMode,
        apiUrl: state.apiUrl,
        apiToken: state.apiToken,
        imageConfig: state.imageConfig
      })
    }
  )
);