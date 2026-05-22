import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import CombinedTrendChart from './CombinedTrendChart';
import HabitHeatmap from './HabitHeatmap';
import {
  getHabitStats,
  getTrendData,
  getHeatmapData,
  calculateSummary,
  getHabitGoal,
  DailyHabitStats
} from '../services/habitStats';
import { useDiaryStore } from '../stores/diaryStore';
import { DEFAULT_HABIT_CONFIGS } from '../types';

interface HabitStatsProps {
  days: number;
}

export interface HabitStatsRef {
  forceRefresh: () => Promise<void>;
}

const HabitStats = forwardRef<HabitStatsRef, HabitStatsProps>(({ days }, ref) => {
  const [stats, setStats] = useState<DailyHabitStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  const habitConfigs = useDiaryStore(state => state.habitConfigs) || DEFAULT_HABIT_CONFIGS;

  // 获取布尔型习惯列表（用于热力图标签）
  const booleanHabits = habitConfigs
    .filter(c => c.enabled && c.type === 'boolean')
    .sort((a, b) => a.order - b.order);

  // 监听refreshKey，当日记数据更新时刷新统计
  const refreshKey = useDiaryStore(state => state.refreshKey);

  const loadStats = async (forceReload = false) => {
    setIsLoading(true);
    try {
      const data = await getHabitStats(days, forceReload);
      setStats(data);
    } catch (error) {
      console.error('Failed to load habit stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 暴露强制刷新方法给父组件
  useImperativeHandle(ref, () => ({
    forceRefresh: async () => {
      await loadStats(true);
    }
  }));

  useEffect(() => {
    loadStats();
  }, [days, refreshKey]);

  // 初始化默认激活标签
  useEffect(() => {
    if (booleanHabits.length > 0 && !activeTab) {
      setActiveTab(booleanHabits[0].id);
    }
  }, [booleanHabits, activeTab]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        加载统计数据...
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        暂无习惯数据
      </div>
    );
  }

  // 获取趋势数据（只取最近7天）
  const recentStats = stats.slice(-7);

  // 获取数值型习惯配置
  const numberHabits = habitConfigs
    .filter(c => c.enabled && c.type === 'number')
    .sort((a, b) => a.order - b.order);

  // 计算30天统计汇总
  const summary = calculateSummary(stats, habitConfigs);

  // 获取热力图数据（30天）
  const heatmapData: Record<string, { date: string; completed: boolean }[]> = {};
  for (const habit of booleanHabits) {
    heatmapData[habit.id] = getHeatmapData(stats, habit.id as 'reading' | 'language' | 'supplements');
  }

  return (
    <div>
      {/* 数值型习惯趋势图 */}
      {numberHabits.map(habit => {
        if (habit.id === 'water' || habit.id === 'steps') {
          // 保留原有的饮水和运动合并图
          if (habit.id === 'water') {
            const waterHabit = numberHabits.find(h => h.id === 'water');
            const stepsHabit = numberHabits.find(h => h.id === 'steps');

            if (waterHabit && stepsHabit) {
              const waterData = getTrendData(recentStats, 'water');
              const stepsData = getTrendData(recentStats, 'steps');
              const waterGoal = getHabitGoal(habitConfigs, 'water');
              const stepsGoal = getHabitGoal(habitConfigs, 'steps');

              return (
                <CombinedTrendChart
                  key="combined"
                  waterData={waterData}
                  stepsData={stepsData}
                  avgWater={summary.avgWater}
                  avgSteps={summary.avgSteps}
                  waterGoalRate={summary.waterGoalRate}
                  stepsGoalRate={summary.stepsGoalRate}
                  waterGoal={waterGoal}
                  stepsGoal={stepsGoal}
                />
              );
            }
          }
          return null;
        }

        // 其他数值型习惯可以单独展示（如果有）
        return null;
      })}

      {/* 布尔型习惯热力图标签切换 */}
      {booleanHabits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-4">
          <div className="flex border-b dark:border-gray-700">
            {booleanHabits.map(habit => (
              <button
                key={habit.id}
                className={`flex-1 py-3 text-sm text-center transition-colors ${
                  activeTab === habit.id
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(habit.id)}
              >
                {habit.emoji} {habit.name}
              </button>
            ))}
          </div>

          {/* 热力图内容 */}
          <div className="p-4">
            {activeTab && heatmapData[activeTab] && (
              <HabitHeatmap
                data={heatmapData[activeTab]}
                title={habitConfigs.find(c => c.id === activeTab)?.description || habitConfigs.find(c => c.id === activeTab)?.name || ''}
                icon={habitConfigs.find(c => c.id === activeTab)?.emoji || ''}
                days={days}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

HabitStats.displayName = 'HabitStats';

export default HabitStats;