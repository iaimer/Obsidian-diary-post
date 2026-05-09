import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiaryEntry, HabitData } from '../types';

interface DiaryState {
  // 连接状态
  vaultConnected: boolean;
  wasConnected: boolean;

  // 当前日记
  currentDiary: DiaryEntry | null;

  // 习惯数据
  habitData: HabitData;

  // 刷新触发器（每次写入后更新，触发DiaryView刷新）
  refreshKey: number;

  // 操作
  setVaultConnected: (connected: boolean) => void;
  updateHabitData: (data: Partial<HabitData>) => void;
  setCurrentDiary: (diary: DiaryEntry | null) => void;
  triggerRefresh: () => void; // 触发刷新
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
      currentDiary: null,
      habitData: defaultHabitData,
      refreshKey: 0,

      setVaultConnected: (connected: boolean) => {
        set({ vaultConnected: connected, wasConnected: connected });
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
        habitData: state.habitData
      })
    }
  )
);