import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';
import { HabitConfig } from '../types';

interface HabitEditModalProps {
  config: HabitConfig;
  currentValue: number;
  onClose: () => void;
  onSave: (value: number) => void;
}

function HabitEditModal({ config, currentValue, onClose, onSave }: HabitEditModalProps) {
  const [value, setValue] = useState(currentValue);
  const goal = config.goal || 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{config.emoji} {config.name}</h2>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">目标: {goal} {config.unit || ''}</div>
          <input
            type="number"
            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-lg text-center focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            value={value}
            onChange={e => setValue(parseInt(e.target.value) || 0)}
            min={0}
            max={goal * 3}
          />
        </div>

        {/* 快捷按钮 */}
        {config.unit === 'mL' && (
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => setValue(Math.max(0, value - 250))}>-250</button>
            <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => setValue(value + 250)}>+250</button>
            <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => setValue(value + 500)}>+500</button>
            <button className="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300" onClick={() => setValue(goal)}>目标</button>
            <button className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => setValue(0)}>清零</button>
          </div>
        )}

        {/* 进度指示 */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className={`h-2 rounded-full ${value >= goal ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            {Math.round((value / goal) * 100)}% 完成
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            onClick={() => onSave(value)}
          >
            保存
          </button>
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

// 获取颜色样式类
function getColorClasses(color: string | undefined, type: 'number' | 'boolean'): {
  bg: string;
  progressBg: string;
  text: string;
} {
  const colorMap: Record<string, { light: string; dark: string; progress: string }> = {
    blue: { light: 'bg-blue-100', dark: 'dark:bg-blue-900/30', progress: 'bg-blue-200 dark:bg-blue-700/50' },
    sky: { light: 'bg-sky-100', dark: 'dark:bg-sky-900/30', progress: 'bg-sky-200 dark:bg-sky-700/50' },
    green: { light: 'bg-green-100', dark: 'dark:bg-green-900/30', progress: 'bg-green-200 dark:bg-green-700/50' },
    emerald: { light: 'bg-emerald-100', dark: 'dark:bg-emerald-900/30', progress: 'bg-emerald-200 dark:bg-emerald-700/50' },
    orange: { light: 'bg-orange-100', dark: 'dark:bg-orange-900/30', progress: 'bg-orange-200 dark:bg-orange-700/50' },
    amber: { light: 'bg-amber-100', dark: 'dark:bg-amber-900/30', progress: 'bg-amber-200 dark:bg-amber-700/50' },
    purple: { light: 'bg-purple-100', dark: 'dark:bg-purple-900/30', progress: 'bg-purple-200 dark:bg-purple-700/50' },
    violet: { light: 'bg-violet-100', dark: 'dark:bg-violet-900/30', progress: 'bg-violet-200 dark:bg-violet-700/50' },
    pink: { light: 'bg-pink-100', dark: 'dark:bg-pink-900/30', progress: 'bg-pink-200 dark:bg-pink-700/50' },
    rose: { light: 'bg-rose-100', dark: 'dark:bg-rose-900/30', progress: 'bg-rose-200 dark:bg-rose-700/50' },
  };

  const defaultColor = type === 'number'
    ? { light: 'bg-blue-100', dark: 'dark:bg-blue-900/30', progress: 'bg-blue-200 dark:bg-blue-700/50' }
    : { light: 'bg-purple-100', dark: 'dark:bg-purple-900/30', progress: 'bg-purple-200 dark:bg-purple-700/50' };

  const c = colorMap[color || ''] || defaultColor;

  return {
    bg: `${c.light} ${c.dark}`,
    progressBg: c.progress,
    text: 'text-gray-700 dark:text-gray-200'
  };
}

export default function HabitTracker() {
  const habitData = useDiaryStore(state => state.habitData);
  const habitConfigs = useDiaryStore(state => state.habitConfigs);
  const updateHabitData = useDiaryStore(state => state.updateHabitData);
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);

  const [editingConfig, setEditingConfig] = useState<HabitConfig | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 获取启用的习惯配置，按顺序排列
  const enabledConfigs = habitConfigs.filter(c => c.enabled).sort((a, b) => a.order - b.order);

  const handleToggleBoolean = async (configId: string) => {
    const newValue = !habitData[configId as keyof typeof habitData];
    updateHabitData({ [configId]: newValue });

    if (vaultConnected || remoteMode) {
      setIsSyncing(true);
      try {
        const dataService = getDataService();
        await dataService.updateHabits({
          ...habitData,
          [configId]: newValue
        });
        useDiaryStore.getState().triggerRefresh();
      } catch (error) {
        console.error('Failed to sync:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveValue = async (configId: string, value: number) => {
    updateHabitData({ [configId]: value });
    setEditingConfig(null);

    if (vaultConnected || remoteMode) {
      setIsSyncing(true);
      try {
        const dataService = getDataService();
        await dataService.updateHabits({
          ...habitData,
          [configId]: value
        });
        useDiaryStore.getState().triggerRefresh();
      } catch (error) {
        console.error('Failed to sync:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 获取数值型习惯的当前值
  const getNumberValue = (configId: string): number => {
    const value = habitData[configId as keyof typeof habitData];
    return typeof value === 'number' ? value : 0;
  };

  // 获取布尔型习惯的当前值
  const getBooleanValue = (configId: string): boolean => {
    const value = habitData[configId as keyof typeof habitData];
    return typeof value === 'boolean' ? value : false;
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        🏃 今日习惯
        {isSyncing && <span className="ml-2 text-xs text-gray-400">同步中...</span>}
      </h2>

      <div className="space-y-2">
        {enabledConfigs.map(config => {
          const colors = getColorClasses(config.color, config.type);

          if (config.type === 'number') {
            // 数值型习惯：进度条样式
            const value = getNumberValue(config.id);
            const goal = config.goal || 100;
            const goalMet = value >= goal;

            return (
              <div
                key={config.id}
                className="relative flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                onClick={() => setEditingConfig(config)}
              >
                {/* 进度条背景 */}
                <div className={`absolute inset-0 ${colors.bg}`} style={{ width: '100%' }} />
                <div
                  className={`absolute inset-y-0 left-0 ${colors.progressBg} transition-all duration-300`}
                  style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
                />

                {/* 内容 */}
                <div className="relative flex items-center gap-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <div>
                    <div className={`text-sm ${colors.text}`}>{config.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">目标 {goal} {config.unit || ''}</div>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className={`text-sm font-medium ${goalMet ? 'text-green-600 dark:text-green-400' : colors.text}`}>
                    {value} {config.unit || ''}
                  </span>
                  {goalMet && <span className="text-green-600 dark:text-green-400">✓</span>}
                </div>
              </div>
            );
          } else {
            // 布尔型习惯：复选框样式
            const checked = getBooleanValue(config.id);

            return (
              <div
                key={config.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${colors.bg}`}
                onClick={() => handleToggleBoolean(config.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <span className={`text-sm ${colors.text}`}>{config.description || config.name}</span>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  checked ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  {checked ? '✓' : ''}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* 编辑弹窗 */}
      {editingConfig && editingConfig.type === 'number' && (
        <HabitEditModal
          config={editingConfig}
          currentValue={getNumberValue(editingConfig.id)}
          onClose={() => setEditingConfig(null)}
          onSave={(value) => handleSaveValue(editingConfig.id, value)}
        />
      )}
    </section>
  );
}