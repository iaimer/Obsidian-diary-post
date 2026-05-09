import HabitStats from './HabitStats';

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* 头部 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="p-4 max-w-md mx-auto">
          <h1 className="text-lg font-medium text-gray-800">📊 习惯统计（近30天）</h1>
        </div>
      </div>

      {/* 统计内容 */}
      <div className="p-4 max-w-md mx-auto">
        <HabitStats days={30} />
      </div>
    </div>
  );
}