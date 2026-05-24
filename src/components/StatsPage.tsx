import { useRef } from 'react';
import HabitStats, { HabitStatsRef } from './HabitStats';
import { PullToRefresh } from './PullToRefresh';
import { StatsIcon } from './Icons';

export default function StatsPage() {
  const habitStatsRef = useRef<HabitStatsRef>(null);

  const handleRefresh = async () => {
    await habitStatsRef.current?.forceRefresh();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-[50px]">
        {/* 头部 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="p-4 max-w-3xl mx-auto">
            <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100 inline-flex items-center gap-2"><StatsIcon /> 习惯统计（近30天）</h1>
          </div>
        </div>

        {/* 统计内容 */}
        <div className="p-4 pb-[80px] max-w-3xl mx-auto">
          <HabitStats ref={habitStatsRef} days={30} />
        </div>
      </div>
    </PullToRefresh>
  );
}