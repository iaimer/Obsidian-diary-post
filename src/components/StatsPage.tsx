import { useRef } from 'react';
import HabitStats, { HabitStatsRef } from './HabitStats';
import { PullToRefresh } from './PullToRefresh';

export default function StatsPage() {
  const habitStatsRef = useRef<HabitStatsRef>(null);

  const handleRefresh = async () => {
    await habitStatsRef.current?.forceRefresh();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-100 pb-16">
        {/* 头部 */}
        <div className="bg-white sticky top-0 z-10 shadow-sm">
          <div className="p-4 max-w-md mx-auto">
            <h1 className="text-lg font-medium text-gray-800">📊 习惯统计（近30天）</h1>
          </div>
        </div>

        {/* 统计内容 */}
        <div className="p-4 max-w-md mx-auto">
          <HabitStats ref={habitStatsRef} days={30} />
        </div>
      </div>
    </PullToRefresh>
  );
}