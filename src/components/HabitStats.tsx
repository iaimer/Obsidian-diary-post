import { useState, useEffect } from 'react';
import CombinedTrendChart from './CombinedTrendChart';
import HabitHeatmap from './HabitHeatmap';
import {
  getHabitStats,
  getTrendData,
  getHeatmapData,
  calculateSummary,
  DailyHabitStats
} from '../services/habitStats';
import { useDiaryStore } from '../stores/diaryStore';

interface HabitStatsProps {
  days: number;
}

const HABIT_TABS = [
  { key: 'reading', label: '📖 阅读' },
  { key: 'language', label: '🇬🇧 语言' },
  { key: 'supplements', label: '💊 补充剂' }
];

export default function HabitStats({ days }: HabitStatsProps) {
  const [stats, setStats] = useState<DailyHabitStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reading');
  
  // 监听refreshKey，当日记数据更新时刷新统计
  const refreshKey = useDiaryStore(state => state.refreshKey);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const data = await getHabitStats(days);
        setStats(data);
      } catch (error) {
        console.error('Failed to load habit stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [days, refreshKey]); // 添加refreshKey到依赖数组

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        加载统计数据...
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无习惯数据
      </div>
    );
  }

  // 获取趋势数据（只取最近7天）
  const recentStats = stats.slice(-7);
  const waterData = getTrendData(recentStats, 'water');
  const stepsData = getTrendData(recentStats, 'steps');

  // 计算30天统计汇总
  const summary = calculateSummary(stats);

  // 获取热力图数据（30天）
  const heatmapData = {
    reading: getHeatmapData(stats, 'reading'),
    language: getHeatmapData(stats, 'language'),
    supplements: getHeatmapData(stats, 'supplements')
  };

  const titles = {
    reading: '阅读',
    language: '学语言',
    supplements: '补充剂'
  };

  const icons = {
    reading: '📖',
    language: '🇬🇧',
    supplements: '💊'
  };

  return (
    <div>
      {/* 饮水+运动趋势合并图 */}
      <CombinedTrendChart
        waterData={waterData}
        stepsData={stepsData}
        avgWater={summary.avgWater}
        avgSteps={summary.avgSteps}
        waterGoalRate={summary.waterGoalRate}
        stepsGoalRate={summary.stepsGoalRate}
      />

      {/* 标签切换 */}
      <div className="bg-white rounded-xl shadow-sm mb-4">
        <div className="flex border-b">
          {HABIT_TABS.map(tab => (
            <button
              key={tab.key}
              className={`flex-1 py-3 text-sm text-center transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 热力图内容 */}
        <div className="p-4">
          <HabitHeatmap
            data={heatmapData[activeTab as keyof typeof heatmapData]}
            title={titles[activeTab as keyof typeof titles]}
            icon={icons[activeTab as keyof typeof icons]}
            days={days}
          />
        </div>
      </div>
    </div>
  );
}