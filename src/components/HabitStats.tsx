import { useState, useEffect } from 'react';
import TrendChart from './TrendChart';
import HabitHeatmap from './HabitHeatmap';
import {
  getHabitStats,
  getTrendData,
  getHeatmapData,
  DailyHabitStats,
  HABIT_GOALS
} from '../services/habitStats';

interface HabitStatsProps {
  days: number;
}

export default function HabitStats({ days }: HabitStatsProps) {
  const [stats, setStats] = useState<DailyHabitStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [days]);

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

  // 获取趋势数据
  const waterData = getTrendData(stats, 'water');
  const stepsData = getTrendData(stats, 'steps');

  // 获取热力图数据
  const readingData = getHeatmapData(stats, 'reading');
  const languageData = getHeatmapData(stats, 'language');
  const supplementsData = getHeatmapData(stats, 'supplements');

  return (
    <div>
      {/* 饮水趋势 */}
      <TrendChart
        data={waterData}
        title="饮水趋势"
        unit="mL"
        goal={HABIT_GOALS.water}
        color="#3b82f6"
        icon="💧"
      />

      {/* 运动趋势 */}
      <TrendChart
        data={stepsData}
        title="运动趋势"
        unit="步"
        goal={HABIT_GOALS.steps}
        color="#f97316"
        icon="🏃"
      />

      {/* 勾选习惯热力图 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          打卡习惯
        </h3>

        {/* 垂直堆叠 */}
        <div className="space-y-3">
          <HabitHeatmap
            data={readingData}
            title="阅读"
            icon="📖"
          />
          <HabitHeatmap
            data={languageData}
            title="学语言"
            icon="🇬🇧"
          />
          <HabitHeatmap
            data={supplementsData}
            title="补充剂"
            icon="💊"
          />
        </div>
      </div>
    </div>
  );
}