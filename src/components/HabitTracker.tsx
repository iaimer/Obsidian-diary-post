import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';

// 习惯目标值
const HABIT_GOALS = {
  water: 1500, // mL
  steps: 6000  // 步
};

interface HabitEditModalProps {
  type: 'water' | 'steps';
  currentValue: number;
  onClose: () => void;
  onSave: (value: number) => void;
}

function HabitEditModal({ type, currentValue, onClose, onSave }: HabitEditModalProps) {
  const [value, setValue] = useState(currentValue);
  const goal = HABIT_GOALS[type];

  const unit = type === 'water' ? 'mL' : '步';
  const icon = type === 'water' ? '💧' : '🏃';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">{icon} {type === 'water' ? '饮水' : '运动'}</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">目标: {goal} {unit}</div>
          <input
            type="number"
            className="w-full p-3 border border-gray-200 rounded-lg text-lg text-center focus:ring-2 focus:ring-indigo-500"
            value={value}
            onChange={e => setValue(parseInt(e.target.value) || 0)}
            min={0}
            max={type === 'water' ? 5000 : 20000}
          />
        </div>

        {type === 'water' && (
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-2 bg-blue-50 rounded-lg text-sm hover:bg-blue-100" onClick={() => setValue(Math.max(0, value - 250))}>-250</button>
            <button className="px-3 py-2 bg-blue-50 rounded-lg text-sm hover:bg-blue-100" onClick={() => setValue(value + 250)}>+250</button>
            <button className="px-3 py-2 bg-blue-50 rounded-lg text-sm hover:bg-blue-100" onClick={() => setValue(value + 500)}>+500</button>
            <button className="px-3 py-2 bg-blue-100 rounded-lg text-sm font-medium" onClick={() => setValue(goal)}>目标</button>
            <button className="px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-gray-100" onClick={() => setValue(0)}>清零</button>
          </div>
        )}

        {/* 进度指示 */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full ${value >= goal ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
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
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HabitTracker() {
  const habitData = useDiaryStore(state => state.habitData);
  const updateHabitData = useDiaryStore(state => state.updateHabitData);
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);

  const [editingType, setEditingType] = useState<'water' | 'steps' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleToggleBoolean = async (key: 'reading' | 'language' | 'supplements') => {
    const newValue = !habitData[key];
    updateHabitData({ [key]: newValue });

    if (vaultConnected || remoteMode) {
      setIsSyncing(true);
      try {
        const dataService = getDataService();
        await dataService.updateHabits({
          ...habitData,
          [key]: newValue
        });
        useDiaryStore.getState().triggerRefresh();
      } catch (error) {
        console.error('Failed to sync:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveValue = async (type: 'water' | 'steps', value: number) => {
    updateHabitData({ [type]: value });
    setEditingType(null);

    if (vaultConnected || remoteMode) {
      setIsSyncing(true);
      try {
        const dataService = getDataService();
        await dataService.updateHabits({
          ...habitData,
          [type]: value
        });
        useDiaryStore.getState().triggerRefresh();
      } catch (error) {
        console.error('Failed to sync:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 计算饮水图标数量
  const waterEmojiCount = Math.floor(habitData.water / 250);
  const waterGoalMet = habitData.water >= HABIT_GOALS.water;
  const stepsGoalMet = habitData.steps >= HABIT_GOALS.steps;

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <h2 className="text-sm font-medium text-gray-500 mb-3">
        🏃 今日习惯
        {isSyncing && <span className="ml-2 text-xs text-gray-400">同步中...</span>}
      </h2>

      <div className="space-y-2">
        {/* 饮水 */}
        <div
          className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setEditingType('water')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div>
              <div className="text-sm text-gray-700">饮水</div>
              <div className="text-xs text-gray-500">目标 1500 mL</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waterEmojiCount > 0 && (
              <span className="text-sm">{'🥤'.repeat(Math.min(waterEmojiCount, 6))}</span>
            )}
            <span className={`text-sm font-medium ${waterGoalMet ? 'text-green-600' : 'text-gray-600'}`}>
              {habitData.water} mL
            </span>
            {waterGoalMet && <span className="text-green-600">✓</span>}
          </div>
        </div>

        {/* 运动 */}
        <div
          className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => setEditingType('steps')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏃</span>
            <div>
              <div className="text-sm text-gray-700">运动</div>
              <div className="text-xs text-gray-500">目标 6000 步</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${stepsGoalMet ? 'text-green-600' : 'text-gray-600'}`}>
              {habitData.steps} 步
            </span>
            {stepsGoalMet && <span className="text-green-600">✓</span>}
          </div>
        </div>

        {/* 阅读 */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            habitData.reading ? 'bg-purple-100' : 'bg-purple-50'
          }`}
          onClick={() => handleToggleBoolean('reading')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <span className="text-sm text-gray-700">阅读/亲子共读</span>
          </div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            habitData.reading ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>
            {habitData.reading ? '✓' : ''}
          </div>
        </div>

        {/* 学语言 */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            habitData.language ? 'bg-indigo-100' : 'bg-indigo-50'
          }`}
          onClick={() => handleToggleBoolean('language')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇬🇧</span>
            <span className="text-sm text-gray-700">学语言</span>
          </div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            habitData.language ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>
            {habitData.language ? '✓' : ''}
          </div>
        </div>

        {/* 补充剂 */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            habitData.supplements ? 'bg-red-100' : 'bg-red-50'
          }`}
          onClick={() => handleToggleBoolean('supplements')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💊</span>
            <span className="text-sm text-gray-700">鱼油/植物甾醇</span>
          </div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            habitData.supplements ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>
            {habitData.supplements ? '✓' : ''}
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editingType && (
        <HabitEditModal
          type={editingType}
          currentValue={habitData[editingType]}
          onClose={() => setEditingType(null)}
          onSave={(value) => handleSaveValue(editingType, value)}
        />
      )}
    </section>
  );
}